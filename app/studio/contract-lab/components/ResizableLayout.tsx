"use client";

import * as React from "react";
import { Panel, Group, Separator } from "react-resizable-panels";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export const ResizablePanelGroup = Group;
export const ResizablePanel = Panel;

export const ResizableHandle = ({
  withHandle = true,
  className,
  ...props
}: React.ComponentProps<typeof Separator> & {
  withHandle?: boolean;
}) => (
  <Separator
    className={cn(
      "relative flex w-[1.5px] items-center justify-center bg-border/50 hover:bg-sky-500/50 transition-colors cursor-col-resize select-none",
      "after:absolute after:inset-y-0 after:left-1/2 after:w-3 after:-translate-x-1/2",
      "data-[panel-group-direction=vertical]:h-[1.5px] data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:cursor-row-resize",
      "data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-3 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0",
      className,
    )}
    {...props}
  >
    {withHandle && (
      <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border border-border/50 bg-background/80 backdrop-blur-sm hover:bg-muted transition-colors">
        <GripVertical className="h-2.5 w-2.5 text-muted-foreground" />
      </div>
    )}
  </Separator>
);
