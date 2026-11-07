import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import  mqtt  from "mqtt";
import { Buffer } from "buffer";
import { MQTT_BROKER_URL, MQTT_TOPIC } from "../services/config.js";

if (typeof global.Buffer === "undefined") {
  global.Buffer = Buffer;
}

const clientOptions = {
  reconnectPeriod: 5000,
  connectTimeout: 30_000,
  protocolVersion: 4,
};

export function useMqttSensor() {
  const [state, setState] = useState({
    temperature: null,
    timestamp: null,
    connectionState: "disconnected",
    error: null,
  });

  const clientRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    if (!MQTT_BROKER_URL || !MQTT_TOPIC) {
      setState((prev) => ({
        ...prev,
        error: "MQTT configuration missing. Update app.json",
      }));
      return;
    }

    const clientId = `rn-monitor-${Math.random().toString(16).slice(2)}`;
    const client = mqtt.connect(MQTT_BROKER_URL, {
      ...clientOptions,
      clientId,
      clean: true,
    });
    clientRef.current = client;

    const handleAppStateChange = (nextAppState) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === "active") {
        client.reconnect();
      }
      appStateRef.current = nextAppState;
    };

  const subscription = AppState.addEventListener("change", handleAppStateChange);

    client.on("connect", () => {
      setState((prev) => ({ ...prev, connectionState: "connected", error: null }));
      client.subscribe(MQTT_TOPIC, { qos: 0 }, (err) => {
        if (err) {
          setState((prev) => ({ ...prev, error: err.message }));
        }
      });
    });

    client.on("reconnect", () => {
      setState((prev) => ({ ...prev, connectionState: "reconnecting" }));
    });

    client.on("error", (error) => {
      setState((prev) => ({ ...prev, error: error.message, connectionState: "error" }));
    });

    client.on("message", (_topic, message) => {
      try {
        const payload = JSON.parse(message.toString());
        setState((prev) => ({
          ...prev,
          temperature: payload.temperature ?? null,
          timestamp: payload.timestamp ?? new Date().toISOString(),
          error: null,
        }));
      } catch (error) {
        setState((prev) => ({ ...prev, error: error.message }));
      }
    });

    return () => {
      subscription.remove();
      client.end(true);
    };
  }, []);

  return state;
}
