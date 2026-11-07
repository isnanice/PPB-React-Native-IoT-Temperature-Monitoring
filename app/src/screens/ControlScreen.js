import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Api } from "../services/api.js";
import { DataTable } from "../components/DataTable.js";
import { tokens } from "../theme/tokens.js";

const { color, space, radius, shadow } = tokens;
const MIN_THRESHOLD = -50;
const MAX_THRESHOLD = 100;

function parseThreshold(text) {
  const normalized = text.trim().replace(",", ".");
  if (normalized === "") return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export function ControlScreen() {
  const [thresholdText, setThresholdText] = useState("30");
  const [note, setNote] = useState("");
  const [touched, setTouched] = useState({ threshold: false });
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const thresholdRef = useRef(null);
  const noteRef = useRef(null);
  const successTimer = useRef(null);

  useEffect(() => {
    return () => {
      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, []);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await Api.getThresholds();
      setHistory(data ?? []);
    } catch (err) {
      setError(err.message || "Couldn't load history. Try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [fetchHistory])
  );

  const latestThreshold = useMemo(() => history?.[0]?.value ?? null, [history]);

  const parsed = useMemo(() => parseThreshold(thresholdText), [thresholdText]);
  const thresholdError = useMemo(() => {
    if (parsed === null) return `Enter a number between ${MIN_THRESHOLD} and ${MAX_THRESHOLD}.`;
    if (parsed < MIN_THRESHOLD || parsed > MAX_THRESHOLD) {
      return `Enter a number between ${MIN_THRESHOLD} and ${MAX_THRESHOLD}.`;
    }
    return null;
  }, [parsed]);

  const showThresholdError = touched.threshold && thresholdError !== null;
  const canSave = !submitting && thresholdError === null;
  const noteCount = `${note.length}/140`;

  const handleSubmit = useCallback(async () => {
    Keyboard.dismiss();
    setTouched((t) => ({ ...t, threshold: true }));
    if (thresholdError !== null) {
      thresholdRef.current?.focus();
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await Api.createThreshold({ value: parsed, note: note.trim() });
      setNote("");
      setShowSuccess(true);
      if (successTimer.current) clearTimeout(successTimer.current);
      successTimer.current = setTimeout(() => setShowSuccess(false), 3000);
      await fetchHistory();
    } catch (err) {
      setError(err.message || "Couldn't save. Try again.");
    } finally {
      setSubmitting(false);
    }
  }, [thresholdError, parsed, note, fetchHistory]);

  return (
    <View style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={88}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
        >
          <View style={styles.card}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Configure Threshold</Text>
              {typeof latestThreshold === "number" ? (
                <View style={styles.currentPill} accessible accessibilityLabel={`Current threshold ${Number(latestThreshold).toFixed(2)} degrees`}>
                  <Ionicons name="speedometer-outline" size={16} color={color.text2} />
                  <Text style={styles.currentText}>
                    Current: {Number(latestThreshold).toFixed(2)}°C
                  </Text>
                </View>
              ) : null}
            </View>

            {showSuccess ? (
              <View
                style={styles.successBanner}
                accessible
                accessibilityLiveRegion="polite"
                accessibilityLabel="Threshold saved"
              >
                <Ionicons name="checkmark-circle" size={18} color={color.successText} />
                <Text style={styles.successText}>Threshold saved</Text>
              </View>
            ) : null}

            <View style={styles.field}>
              <Text
                style={styles.label}
                accessibilityLabel="Threshold in degrees Celsius, required"
              >
                Threshold (°C) <Text style={styles.required}>*</Text>
              </Text>
              <Text style={styles.helper}>Alert when temperature exceeds this value.</Text>
              <TextInput
                ref={thresholdRef}
                style={[styles.input, showThresholdError && styles.inputError]}
                keyboardType="decimal-pad"
                returnKeyType="next"
                value={thresholdText}
                onChangeText={(t) => {
                  setThresholdText(t);
                  if (showSuccess) setShowSuccess(false);
                }}
                onBlur={() => setTouched((t) => ({ ...t, threshold: true }))}
                onSubmitEditing={() => noteRef.current?.focus()}
                accessibilityLabel="Threshold in degrees Celsius, required"
                accessibilityHint={`Number between ${MIN_THRESHOLD} and ${MAX_THRESHOLD}`}
                accessibilityState={{ invalid: showThresholdError }}
                maxLength={8}
                selectTextOnFocus
              />
              {showThresholdError ? (
                <Text style={styles.fieldError} accessibilityRole="alert">
                  {thresholdError}
                </Text>
              ) : null}
            </View>

            <View style={styles.field}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Note</Text>
                <Text style={styles.counter}>{noteCount}</Text>
              </View>
              <TextInput
                ref={noteRef}
                style={[styles.input, styles.noteInput]}
                value={note}
                onChangeText={setNote}
                multiline
                numberOfLines={3}
                maxLength={140}
                placeholder="Describe why you are changing the threshold"
                placeholderTextColor={color.text3}
                returnKeyType="done"
                accessibilityLabel="Note, optional"
                accessibilityHint="Reason for changing the threshold"
                onSubmitEditing={handleSubmit}
              />
            </View>

            {error ? (
              <View
                style={styles.errorBanner}
                accessible
                accessibilityLiveRegion="polite"
                accessibilityLabel={`Error: ${error}`}
              >
                <Ionicons name="alert-circle-outline" size={18} color={color.dangerText} />
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              style={({ pressed }) => [
                styles.button,
                !canSave && styles.buttonDisabled,
                pressed && canSave && styles.pressed,
              ]}
              onPress={handleSubmit}
              disabled={!canSave}
              accessibilityLabel="Save threshold"
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSave, busy: submitting }}
              accessibilityHint="Saves the new temperature threshold"
            >
              {submitting ? (
                <ActivityIndicator color={color.onPrimary} />
              ) : (
                <Text style={styles.buttonText}>Save Threshold</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Threshold history</Text>
          </View>
          <DataTable
            columns={[
              {
                key: "created_at",
                title: "Saved At",
                flex: 1.4,
                render: (value) => (value ? new Date(value).toLocaleString() : "--"),
              },
              {
                key: "value",
                title: "Threshold °C",
                flex: 0.9,
                numeric: true,
                render: (value) =>
                  typeof value === "number" ? Number(value).toFixed(2) : "--",
              },
              {
                key: "note",
                title: "Note",
                flex: 1.1,
                render: (value) => value || "—",
              },
            ]}
            data={history}
            keyExtractor={(item) => item.id}
            loading={loading}
            emptyTitle="No thresholds yet"
            emptyMessage="Save your first threshold above."
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: color.bg,
  },
  flex: {
    flex: 1,
  },
  container: {
    padding: space.lg,
    paddingBottom: 32,
    gap: space.lg,
    backgroundColor: color.bg,
  },
  card: {
    backgroundColor: color.surface,
    padding: space.xl,
    borderRadius: radius.card,
    borderCurve: "continuous",
    gap: space.lg,
    borderWidth: 1,
    borderColor: color.border,
    boxShadow: shadow.card,
  },
  title: {
    fontSize: tokens.type.title,
    fontWeight: "700",
    color: color.text,
    letterSpacing: -0.5,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: space.sm,
  },
  currentPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: color.surface2,
    borderRadius: radius.pill,
    borderCurve: "continuous",
    paddingVertical: 6,
    paddingHorizontal: space.md,
  },
  currentText: {
    fontSize: 13,
    fontWeight: "600",
    color: color.text2,
    fontVariant: ["tabular-nums"],
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: color.successBg,
    borderWidth: 1,
    borderColor: color.successBorder,
    borderRadius: radius.input,
    borderCurve: "continuous",
    padding: space.md,
  },
  successText: {
    fontSize: 14,
    fontWeight: "600",
    color: color.successText,
  },
  field: {
    gap: space.sm,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: color.text,
  },
  required: {
    color: color.dangerText,
  },
  counter: {
    fontSize: 12,
    color: color.text3,
    fontVariant: ["tabular-nums"],
  },
  helper: {
    fontSize: 13,
    color: color.text2,
  },
  input: {
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.input,
    borderCurve: "continuous",
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 48,
    fontSize: 17,
    color: color.text,
    backgroundColor: color.surface,
    fontVariant: ["tabular-nums"],
  },
  inputError: {
    borderColor: color.dangerText,
  },
  fieldError: {
    fontSize: 13,
    color: color.dangerText,
  },
  noteInput: {
    minHeight: 64,
    textAlignVertical: "top",
    // ponytail: gap between wrapped lines only — py trimmed via minHeight/padding
    lineHeight: 22,
    paddingVertical: 8,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: color.dangerBg,
    borderWidth: 1,
    borderColor: color.dangerBorder,
    borderRadius: radius.input,
    borderCurve: "continuous",
    padding: space.md,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 14,
    color: color.dangerText,
  },
  button: {
    minHeight: 52,
    backgroundColor: color.primary,
    borderRadius: radius.cta,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    color: color.onPrimary,
    fontWeight: "600",
    fontSize: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    // ponytail: same rhythm as Monitoring history (taller above, tucked below)
    marginTop: space.md,
    marginBottom: -space.sm,
  },
  sectionTitle: {
    fontSize: tokens.type.section,
    fontWeight: "700",
    color: color.text,
  },
});
