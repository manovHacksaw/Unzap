import { useState, useEffect, type RefObject } from "react";

export function useLayoutResize(centerPaneRef: RefObject<HTMLDivElement | null>) {
  const [rightPanelWidth, setRightPanelWidth] = useState(320);
  const [isResizingRightPanel, setIsResizingRightPanel] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(260);
  const [isResizingTerminal, setIsResizingTerminal] = useState(false);

  useEffect(() => {
    if (!isResizingRightPanel) return;
    const onMouseMove = (event: MouseEvent) =>
      setRightPanelWidth(Math.min(Math.max(window.innerWidth - event.clientX, 260), 520));
    const onMouseUp = () => setIsResizingRightPanel(false);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isResizingRightPanel]);

  useEffect(() => {
    if (!isResizingTerminal) return;
    const onMouseMove = (event: MouseEvent) => {
      const pane = centerPaneRef.current;
      if (!pane) return;
      const rect = pane.getBoundingClientRect();
      const nextHeight = rect.bottom - event.clientY;
      const maxHeight = Math.max(220, rect.height - 180);
      setTerminalHeight(Math.min(Math.max(nextHeight, 160), maxHeight));
    };
    const onMouseUp = () => setIsResizingTerminal(false);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isResizingTerminal, centerPaneRef]);

  return {
    rightPanelWidth,
    isResizingRightPanel,
    setIsResizingRightPanel,
    terminalHeight,
    isResizingTerminal,
    setIsResizingTerminal,
  };
}
