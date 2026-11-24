"use client";
import { useRouter } from "next/navigation";
import { api } from "@/lib/fetcher";
import { useForm, useAction } from "@/lib/hooks";
import { FormMessage, TextField, SubmitButton } from "@/components/ui/fields";

export default function ReturnForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const { values, field } = useForm({ orderId, reason: "", details: "" });
  const { run, loading, msg, status } = useAction();

  return (
    <form
      className="border rounded p-3 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        run(async () => {
          await api("/api/returns", "POST", values);
          router.refresh();
        }, "Return requested!");
      }}
    >
      <h2 className="font-semibold">Request a return</h2>
      <TextField label="Reason (size, damaged, wrong item...)" required {...field("reason")} />
      <TextField label="Details" rows={3} {...field("details")} />
      <FormMessage msg={msg} status={status} />
      <SubmitButton loading={loading}>Submit request</SubmitButton>
    </form>
  );
}
