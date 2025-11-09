export function LoadingSpinner() {
  return (
    <div className="text-center py-10 bg-container shadow-card border border-custom rounded-lg">
      <div className="w-[50px] h-[50px] mx-auto mb-5 border-4 border-border-custom border-t-primary rounded-full animate-spin-custom" />
      <p className="text-secondary text-base">Loading JIRA data...</p>
    </div>
  )
}
