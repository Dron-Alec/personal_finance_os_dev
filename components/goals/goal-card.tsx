import { XIcon } from "lucide-react";
import type { Goal, GoalProgress } from "@/lib/goals";
import { removeGoal } from "@/lib/actions/goals";
import { ConfirmActionButton } from "@/components/confirm-action-button";
import { ProgressRing } from "@/components/goals/progress-ring";
import { CATEGORICAL_PALETTE, DELTA_BAD_COLOR, DELTA_GOOD_COLOR } from "@/lib/chart-colors";
import { formatCurrency, formatSignedCurrency } from "@/lib/format";

export function GoalCard({
  goal,
  progress,
  scopeLabel,
}: {
  goal: Goal;
  progress: GoalProgress;
  scopeLabel: string;
}) {
  const ringColor = progress.reached ? DELTA_GOOD_COLOR : CATEGORICAL_PALETTE[0];

  return (
    <div className="flex items-start gap-4 rounded-lg border p-4">
      <ProgressRing percent={progress.percent} color={ringColor} />
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium">{goal.name}</p>
            <p className="text-xs text-muted-foreground">{scopeLabel}</p>
          </div>
          <ConfirmActionButton
            label={<XIcon className="size-3.5" />}
            title={`Remove "${goal.name}"?`}
            description="This deletes the goal. It doesn't affect any account balances or snapshots."
            confirmLabel="Remove"
            onConfirm={() => removeGoal(goal.id)}
            variant="ghost"
            size="icon-xs"
          />
        </div>
        <p className="text-sm">
          {formatCurrency(progress.currentValue, 0)} of {formatCurrency(goal.target_amount, 0)}
          <span className="text-muted-foreground"> by {goal.target_date}</span>
        </p>
        {progress.reached ? (
          <p className="text-sm font-medium" style={{ color: DELTA_GOOD_COLOR }}>
            Goal reached
          </p>
        ) : (
          <>
            <p className="text-sm" style={{ color: progress.variance >= 0 ? DELTA_GOOD_COLOR : DELTA_BAD_COLOR }}>
              {formatSignedCurrency(progress.variance, 0)} {progress.variance >= 0 ? "ahead of" : "behind"} pace
            </p>
            <p className="text-xs text-muted-foreground">
              {progress.projectedDate
                ? `At the current rate, projected ${progress.projectedDate}`
                : "Not currently on track — recent balance isn't trending toward this goal"}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
