"use client";
import { useState } from "react";

export function useForm<T extends Record<string, any>>(initial: T) {
  const [values, setValues] = useState<T>(initial);
  const field = <K extends keyof T>(k: K) => ({
    value: values[k],
    onChange: (v: T[K]) => setValues((p) => ({ ...p, [k]: v })),
  });
  return { values, setValues, field };
}

export function useAction() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [status, setStatus] = useState<"" | "ok" | "error">("");
  async function run(fn: () => Promise<any>, success = "Saved!") {
    setLoading(true);
    setMsg("");
    setStatus("");
    try {
      await fn();
      setMsg(success);
      setStatus("ok");
    } catch (e: any) {
      setMsg(e.message);
      setStatus("error");
    }
    setLoading(false);
  }
  return { run, loading, msg, status };
}
