import { useState, useEffect } from "react";
import { fetchPatternInstructions } from "../utils/fetchPatternInstructions";

export function usePatternInstructions(designId, enabled = false) {
  const [markdown, setMarkdown] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!enabled || !designId) return;

    let cancelled = false;
    setLoading(true);
    setError(false);
    setMarkdown(null);

    fetchPatternInstructions(designId).then((result) => {
      if (cancelled) return;
      if (result === null) {
        setError(true);
      } else {
        setMarkdown(result);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [designId, enabled]);

  return { markdown, loading, error };
}
