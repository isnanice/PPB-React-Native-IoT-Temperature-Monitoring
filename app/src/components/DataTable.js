import { memo } from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { tokens } from "../theme/tokens.js";

const { color, space, radius, shadow } = tokens;

function SkeletonRows({ count = 3 }) {
  return (
    <View accessible accessibilityLabel="Loading data">
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[styles.dataRow, i === 0 && styles.firstDataRow]}>
          <View style={[styles.skeleton, { flex: 1.4 }]} />
          <View style={[styles.skeleton, { flex: 0.9 }]} />
          <View style={[styles.skeleton, { flex: 0.9 }]} />
        </View>
      ))}
    </View>
  );
}

const DataRow = memo(function DataRow({ item, columns, isFirst }) {
  const a11yLabel = columns
    .map((c) => {
      const raw = item[c.key];
      const rendered = c.render ? c.render(raw, item) : raw;
      const secondary = c.renderSecondary ? c.renderSecondary(raw, item) : null;
      return `${c.title} ${rendered ?? "--"}${secondary ? ` ${secondary}` : ""}`;
    })
    .join(", ");
  return (
    <View
      style={[styles.dataRow, isFirst && styles.firstDataRow]}
      accessible
      accessibilityLabel={a11yLabel}
    >
      {columns.map((column) => {
        const raw = item[column.key];
        const rendered = column.render ? column.render(raw, item) : raw;
        const secondary = column.renderSecondary
          ? column.renderSecondary(raw, item)
          : null;
        const isEmptyDash = rendered === "-" || rendered === "—";
        return (
          <View
            key={column.key}
            style={[
              styles.cellWrap,
              { flex: column.flex ?? 1 },
              column.numeric && styles.numericWrap,
            ]}
          >
            <Text
              style={[
                styles.cell,
                column.numeric && styles.numericCell,
                isEmptyDash && styles.dashCell,
              ]}
              numberOfLines={2}
            >
              {rendered ?? "--"}
            </Text>
            {secondary != null ? (
              <Text style={styles.secondaryCell} numberOfLines={1}>
                {secondary}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
});

export function DataTable({
  columns,
  data,
  keyExtractor,
  emptyTitle = "No data yet",
  emptyMessage = "Items will appear here.",
  emptyActionLabel,
  onEmptyAction,
  loading = false,
  loadingRows = 3,
}) {
  if (!columns?.length) {
    return null;
  }

  const hasData = Array.isArray(data) && data.length > 0;

  return (
    <View
      style={styles.container}
      accessible
      accessibilityLabel="Data table"
      accessibilityRole="none"
    >
      <View style={styles.headerRow} accessibilityRole="header">
        {columns.map((column) => (
          <Text
            key={column.key}
            style={[
              styles.headerCell,
              { flex: column.flex ?? 1 },
              column.numeric && styles.numericCell,
            ]}
            numberOfLines={1}
          >
            {column.title}
          </Text>
        ))}
      </View>
      {loading ? (
        <SkeletonRows count={loadingRows} />
      ) : hasData ? (
        data.map((item, index) => (
          <DataRow
            key={keyExtractor ? keyExtractor(item, index) : String(index)}
            item={item}
            columns={columns}
            isFirst={index === 0}
          />
        ))
      ) : (
        <View style={styles.emptyWrap}>
          <Ionicons name="file-tray-outline" size={24} color={color.text3} />
          <Text style={styles.emptyTitle}>{emptyTitle}</Text>
          <Text style={styles.emptyMessage}>{emptyMessage}</Text>
          {emptyActionLabel && onEmptyAction ? (
            <Pressable
              style={({ pressed }) => [
                styles.emptyAction,
                pressed && styles.pressed,
              ]}
              onPress={onEmptyAction}
              accessibilityLabel={emptyActionLabel}
              accessibilityRole="button"
              hitSlop={8}
            >
              <Text style={styles.emptyActionText}>{emptyActionLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.card,
    borderCurve: "continuous",
    overflow: "hidden",
    marginVertical: space.md,
    boxShadow: shadow.card,
  },
  headerRow: {
    flexDirection: "row",
    gap: space.sm,
    backgroundColor: color.bg,
    paddingVertical: 10,
    paddingHorizontal: space.md,
  },
  headerCell: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: color.text3,
  },
  dataRow: {
    flexDirection: "row",
    gap: space.sm,
    alignItems: "center",
    backgroundColor: color.surface,
    borderTopWidth: 1,
    borderTopColor: color.border,
    minHeight: 52,
    paddingVertical: 14,
    paddingHorizontal: space.md,
  },
  firstDataRow: {
    borderTopWidth: 0,
  },
  cell: {
    fontSize: 14,
    color: color.text,
  },
  secondaryCell: {
    fontSize: 12,
    color: color.text3,
    fontVariant: ["tabular-nums"],
  },
  cellWrap: {
    alignItems: "flex-start",
  },
  numericWrap: {
    // ponytail: all numeric columns are temperature columns → centered
    alignItems: "center",
  },
  numericCell: {
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  dashCell: {
    color: color.text3,
  },
  skeleton: {
    height: 16,
    backgroundColor: color.skeleton,
    borderRadius: 8,
    borderCurve: "continuous",
  },
  emptyWrap: {
    alignItems: "center",
    gap: space.sm,
    padding: space.xxl,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: color.text,
  },
  emptyMessage: {
    fontSize: 14,
    color: color.text2,
    textAlign: "center",
  },
  emptyAction: {
    marginTop: space.sm,
    minHeight: tokens.hit,
    justifyContent: "center",
    backgroundColor: color.primary,
    borderRadius: radius.cta,
    borderCurve: "continuous",
    paddingVertical: 12,
    paddingHorizontal: space.xl,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  emptyActionText: {
    color: color.onPrimary,
    fontWeight: "600",
    fontSize: 14,
  },
});
