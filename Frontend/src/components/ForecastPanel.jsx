import React from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp } from "lucide-react";
import { getDealForecast } from "../services/api";

const money = (value) =>
  `$${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default function ForecastPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ["deal-forecast"],
    queryFn: () => getDealForecast(6)
  });

  const buckets = data?.buckets || [];
  const max = Math.max(1, ...buckets.map((bucket) => bucket.gross));

  return (
    <section className="forecast-panel" aria-label="Weighted revenue forecast">
      <div className="forecast-head">
        <div>
          <p className="forecast-eyebrow">FORECAST · NEXT 6 MONTHS</p>
          <h3>Weighted pipeline</h3>
        </div>
        <div className="forecast-total">
          <TrendingUp size={17} aria-hidden="true" />
          <strong>{isLoading ? "—" : money(data?.weightedPipeline)}</strong>
          <span>of {isLoading ? "—" : money(data?.openPipeline)} open</span>
        </div>
      </div>

      {isLoading ? (
        <p className="forecast-empty">Calculating from your deals…</p>
      ) : (
        <div className="forecast-bars">
          {buckets.map((bucket) => (
            <div className="forecast-bar" key={bucket.key}>
              <div className="forecast-bar-track">
                <div className="forecast-bar-gross" style={{ height: `${Math.max(3, (bucket.gross / max) * 100)}%` }} />
                <div className="forecast-bar-weighted" style={{ height: `${Math.max(2, (bucket.weighted / max) * 100)}%` }} />
              </div>
              <strong>{money(bucket.weighted)}</strong>
              <span>{bucket.label}</span>
              <small>{bucket.count} {bucket.count === 1 ? "deal" : "deals"}</small>
            </div>
          ))}
        </div>
      )}
      <p className="forecast-legend">
        <span className="legend-swatch gross" /> Gross pipeline
        <span className="legend-swatch weighted" /> Weighted by stage probability
      </p>
    </section>
  );
}
