interface ServiceCardProps {
  title: string;
  icon: string;
  status: boolean;
  data: Array<{ label: string; value: string; color?: string }>;
  error?: string;
}

export default function ServiceCard({
  title,
  icon,
  status,
  data,
  error,
}: ServiceCardProps) {
  return (
    <div
      className={`bg-sky-50 dark:bg-sky-900/40 rounded-xl shadow-lg p-6 border-2 transition-all hover:shadow-xl ${
        status
          ? "border-blue-600 dark:border-blue-500"
          : "border-red-600 dark:border-red-500"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{icon}</span>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-sky-50">
              {title}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`w-2 h-2 rounded-full ${
                  status ? "bg-green-500" : "bg-red-500"
                }`}
              />
              <span
                className={`text-xs font-medium ${
                  status
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {status ? "Operational" : "Error"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Data */}
      {data.length > 0 && (
        <div className="space-y-2">
          {data.map((item, index) => (
            <div key={index} className="flex justify-between items-center">
              <span className="text-sm text-slate-700 dark:text-sky-200">
                {item.label}:
              </span>
              <span
                className={`text-sm font-medium ${
                  item.color || "text-slate-900 dark:text-sky-50"
                }`}
              >
                {item.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
