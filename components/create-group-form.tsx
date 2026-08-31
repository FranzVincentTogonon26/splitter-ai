"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useActionState } from "react";
import { toast } from "sonner";

import { createGroup, type CreateGroupState } from "@/app/actions/groups";
import { Button } from "@/components/ui/button";

/**
 * The dashboard's create-group form. Pending label while the action runs;
 * success lands as a toast and the client navigates to the new group.
 */
export function CreateGroupForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    async (_prev: CreateGroupState, formData: FormData) => {
      const result = await createGroup(formData);
      if (result.groupId) toast.success("Group created");
      return result;
    },
    {},
  );

  useEffect(() => {
    if (state.groupId) router.push(`/groups/${state.groupId}`);
  }, [state, router]);

  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="flex items-center gap-3">
      <input
        name="name"
        type="text"
        placeholder="New group name..."
        required
        className="h-10 w-52 bg-transparent border border-border px-4 py-5 rounded-lg px-1 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-0"
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Creating..." : "Create group"}
      </Button>
    </form>
  );
}