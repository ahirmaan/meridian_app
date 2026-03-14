import { supabase, supabaseEnabled } from "./supabase";

export interface DbChat {
    id: string;
    user_id: string;
    title: string;
    type: "chat" | "project";
    is_locked: boolean;
    description?: string;
    default_model?: string;
    multi_model?: boolean;
    project_rules?: string;
    created_at: string;
    updated_at: string;
}

export interface DbWorkspace {
    id: string;
    name: string;
    created_at: string;
}

export interface DbMessage {
    id: string;
    chat_id: string;
    role: "user" | "assistant";
    content: string;
    created_at: string;
}

// ── Chats ──────────────────────────────────────────

export async function loadChats(userId: string): Promise<DbChat[]> {
    if (!supabaseEnabled || !supabase) return [];

    const query = supabase
        .from("chats")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
        console.error("loadChats error:", error.message);
        return [];
    }
    return data || [];
}

export async function createChat(
    userId: string,
    title: string,
    type: "chat" | "project" = "chat",
    isLocked = false,
    extraParams?: {
        description?: string;
        default_model?: string;
        multi_model?: boolean;
        project_rules?: string;
    }
): Promise<DbChat | null> {
    if (!supabaseEnabled || !supabase) return null;
    const { data, error } = await supabase
        .from("chats")
        .insert({
            user_id: userId,
            title,
            type,
            is_locked: isLocked,
            description: extraParams?.description,
            default_model: extraParams?.default_model,
            multi_model: extraParams?.multi_model,
            project_rules: extraParams?.project_rules,
        })
        .select()
        .single();

    if (error) {
        console.error("createChat error:", error.message);
        return null;
    }
    return data;
}

// ── Chat Actions ──────────────────────────────────────────

export async function renameChat(chatId: string, title: string) {
    if (!supabaseEnabled || !supabase) return;
    const { error } = await supabase
        .from("chats")
        .update({ title, updated_at: new Date().toISOString() })
        .eq("id", chatId);

    if (error) console.error("renameChat error:", error.message);
}

export async function deleteChat(chatId: string) {
    if (!supabaseEnabled || !supabase) return;
    const { error } = await supabase.from("chats").delete().eq("id", chatId);
    if (error) console.error("deleteChat error:", error.message);
}
export async function toggleChatLocked(chatId: string, isLocked: boolean) {
    if (!supabaseEnabled || !supabase) return;
    const { error } = await supabase
        .from("chats")
        .update({ is_locked: isLocked, updated_at: new Date().toISOString() })
        .eq("id", chatId);

    if (error) console.error("toggleChatLocked error:", error.message);
}

export async function updateChatTimestamp(chatId: string) {
    if (!supabaseEnabled || !supabase) return;
    await supabase
        .from("chats")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", chatId);
}

export async function updateProjectRules(chatId: string, rules: string) {
    if (!supabaseEnabled || !supabase) return;
    const { error } = await supabase
        .from("chats")
        .update({ project_rules: rules, updated_at: new Date().toISOString() })
        .eq("id", chatId);

    if (error) {
        console.error("updateProjectRules error:", error.message);
        alert("Failed to save project rules: " + error.message);
    } else {
        console.log("updateProjectRules success for", chatId);
    }
}

// ── Messages ───────────────────────────────────────

export async function loadMessages(chatId: string): Promise<DbMessage[]> {
    if (!supabaseEnabled || !supabase) return [];
    const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });

    if (error) {
        console.error("loadMessages error:", error.message);
        return [];
    }
    return data || [];
}

export async function saveMessage(
    chatId: string,
    role: "user" | "assistant",
    content: string
): Promise<DbMessage | null> {
    if (!supabaseEnabled || !supabase) return null;
    const { data, error } = await supabase
        .from("messages")
        .insert({ chat_id: chatId, role, content })
        .select()
        .single();

    if (error) {
        console.error("saveMessage error:", error.message);
        return null;
    }
    return data;
}
