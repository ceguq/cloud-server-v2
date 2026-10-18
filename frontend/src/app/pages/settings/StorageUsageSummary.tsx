import { useCallback, useEffect, useState } from "react";
import { RotateCw } from "lucide-react";
import {
  getStorageBreakdown,
  type StorageBreakdownInfo,
} from "../../../services/storageBreakdownService";

type StorageUsageSummaryProps = {
  cardBg: string;
  panelBg: string;
  borderColor: string;
  textColor: string;
  mutedColor: string;
};

type StatCardProps = Pick<
  StorageUsageSummaryProps,
  "cardBg" | "borderColor" | "textColor" | "mutedColor"
> & { label: string; value: string };

function StatCard({
  label,
  value,
  cardBg,
  borderColor,
  textColor,
  mutedColor,
}: StatCardProps) {
  return (
    <div
      className="min-w-0 rounded-xl p-4"
      style={{ background: cardBg, border: `1px solid ${borderColor}` }}
    >
      <div className="text-xs" style={{ color: mutedColor }}>
        {label}
      </div>
      <div className="mt-2 break-words text-lg font-semibold" style={{ color: textColor }}>
        {value}
      </div>
    </div>
  );
}

export function StorageUsageSummary({
  cardBg,
  panelBg,
  borderColor,
  textColor,
  mutedColor,
}: StorageUsageSummaryProps) {
  const [storage, setStorage] = useState<StorageBreakdownInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(false);

    try {
      setStorage(await getStorageBreakdown());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <section
      aria-labelledby="storage-usage-title"
      className="mb-4 rounded-xl p-5"
      style={{ background: panelBg, border: `1px solid ${borderColor}` }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3
            id="storage-usage-title"
            className="text-sm font-semibold"
            style={{ color: textColor }}
          >
            Storage usage
          </h3>
          <p className="mt-1 text-xs" style={{ color: mutedColor }}>
            Total and free space show server disk capacity, not a personal user quota.
            Used storage and categories reflect files associated with your account.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            background: cardBg,
            border: `1px solid ${borderColor}`,
            color: textColor,
          }}
        >
          <RotateCw size={13} aria-hidden="true" />
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {loading && (
        <p className="mt-4 text-xs" role="status" style={{ color: mutedColor }}>
          Loading storage information...
        </p>
      )}

      {!loading && error && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-red-400" role="alert">
            Storage information could not be loaded. Please try again.
          </p>
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-lg px-3 py-2 text-xs font-medium"
            style={{
              background: cardBg,
              border: `1px solid ${borderColor}`,
              color: textColor,
            }}
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && storage && (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <StatCard
              label="Used storage"
              value={storage.used_human}
              cardBg={cardBg}
              borderColor={borderColor}
              textColor={textColor}
              mutedColor={mutedColor}
            />
            <StatCard
              label="Free server disk"
              value={storage.free_human ?? "Unavailable"}
              cardBg={cardBg}
              borderColor={borderColor}
              textColor={textColor}
              mutedColor={mutedColor}
            />
            <StatCard
              label="Total server disk"
              value={storage.limit_human || "Unavailable"}
              cardBg={cardBg}
              borderColor={borderColor}
              textColor={textColor}
              mutedColor={mutedColor}
            />
          </div>

          <div className="mt-5">
            <h4 className="text-xs font-semibold" style={{ color: textColor }}>
              Your files by category
            </h4>
            <div className="mt-3 space-y-3">
              {storage.categories.map((category) => {
                const sharePercent = Math.min(
                  100,
                  Math.max(0, category.share_percent),
                );
                const displayedSharePercent = Math.round(sharePercent);

                return (
                  <div key={category.key}>
                    <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                      <span style={{ color: textColor }}>{category.name}</span>
                      <span style={{ color: mutedColor }}>
                        {category.human} ({displayedSharePercent}%)
                      </span>
                    </div>
                    <div
                      className="h-1.5 overflow-hidden rounded-full"
                      style={{ background: cardBg }}
                    >
                      <div
                        className="h-full rounded-full bg-blue-500"
                        style={{ width: `${sharePercent}%` }}
                        role="progressbar"
                        aria-label={`${category.name} share of your stored files`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={sharePercent}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
