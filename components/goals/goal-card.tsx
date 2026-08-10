"use client";

import { XIcon } from "lucide-react";
import type { Goal, GoalProgress } from "@/lib/goals";
import { removeGoal } from "@/lib/actions/goals";
import { ConfirmActionButton } from "@/components/confirm-action-button";
import { ProgressRing } from "@/components/goals/progress-ring";
import { CATEGORICAL_PALETTE, DELTA_BAD_COLOR, DELTA_GOOD_COLOR } from "@/lib/chart-colors";
import { formatCurrency, formatSignedCurrency } from "@/lib/format";

const RING_COLOR: Record<GoalProgress["status"], string> = {
  met: DELTA_GOOD_COLOR,
  on_track: DELTA_GOOD_COLOR,
  off_track: DELTA_BAD_COLOR,
  overdue: DELTA_BAD_COLOR,
  no_data: CATEGORICAL_PALETTE[0],
};

function paceLine(progress: GoalProgress) {
  if (progress.status === "no_data") {
    return { text: "Not enough balance history yet to gauge pace.", color: undefined };
  }
  if (progress.variance === null) return null;
  const ahead = progress.variance >= 0;
  return {
    text: `${formatSignedCurrency(progress.variance, 0)}/mo ${ahead ? "ahead of" : "behind"} the pace needed`,
    color: ahead ? DELTA_GOOD_COLOR : DELTA_BAD_COLOR,
  };
}

export function GoalCard({
  goal,
  progress,
  scopeLabel,
}: {
  goal: Goal;
  progress: GoalProgress;
  scopeLabel: string;
}) {
  const pace = paceLine(progress);

  return (
    <div className="flex items-start gap-4 rounded-lg border p-4">
      <ProgressRing percent={progress.percent} color={RING_COLOR[progress.status]} />
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

        {progress.status === "met" && (
          <p className="text-sm font-medium" style={{ color: DELTA_GOOD_COLOR }}>
            Goal reached
          </p>
        )}
        {progress.status === "overdue" && (
          <p className="text-sm font-medium" style={{ color: DELTA_BAD_COLOR }}>
            Target date passed — not yet reached
          </p>
        )}
        {(progress.status === "on_track" || progress.status === "off_track" || progress.status === "no_data") &&
          pace && (
            <p
              className={pace.color ? "text-sm" : "text-sm text-muted-foreground"}
              style={pace.color ? { color: pace.color } : undefined}
            >
              {pace.text}
            </p>
          )}

        {progress.projected && (
          <p className="text-xs text-muted-foreground">
            At ~{formatCurrency(progress.projected.assumedPaceMonthly, 0)}/mo, projected {progress.projected.date}
          </p>
        )}
      </div>
    </div>
  );
}
