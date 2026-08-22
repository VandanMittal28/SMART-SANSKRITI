"use client"
import { useLang } from "@/lib/languageContext"

export function MetricsRow() {
  const { t } = useLang()
  const metrics = [
    { icon: "🏛️", label: t('monuments_label'), value: "15+" },
    { icon: "🔮", label: t('nvidia_vision'), value: "" },
    { icon: "🌍", label: t('sdg_label'), value: "" },
    { icon: "⚡", label: t('under_2_sec'), value: "" },
  ]
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {metrics.map((metric, index) => (
        <div key={index} className={`glass-card rounded-xl p-4 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg animate-fade-in stagger-${index + 1}`}>
          <span className="text-3xl mb-2 block">{metric.icon}</span>
          <p className="text-[#C9A84C] font-bold text-lg">{metric.value || metric.label}</p>
          {metric.value && <p className="text-[#C4A882] text-sm">{metric.label}</p>}
        </div>
      ))}
    </div>
  )
}
