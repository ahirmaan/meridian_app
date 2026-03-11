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
    model_roles?: Record<string, string>;
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
        model_roles?: Record<string, string>;
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
            model_roles: extraParams?.model_roles,
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

export async function updateChatRoles(chatId: string, roles: Record<string, string>) {
    console.log(`[chatService] updateChatRoles starting for ${chatId}...`);
    console.log(`[chatService] Roles to save:`, JSON.stringify(roles));

    if (!supabaseEnabled || !supabase) {
        console.error("[chatService] Supabase not initialized correctly.");
        throw new Error("Supabase not initialized");
    }

    // Defensive check: ensure chatId is valid
    if (!chatId || chatId === "null" || chatId === "undefined") {
        console.error("[chatService] Invalid chatId provided to updateChatRoles");
        return;
    }

    const { data, error, count } = await supabase
        .from("chats")
        .update({
            model_roles: roles,
            updated_at: new Date().toISOString()
        })
        .eq("id", chatId)
        .select();

    if (error) {
        console.error("[chatService] Supabase Update Error:", error);
        console.error("[chatService] Error Message:", error.message);
        console.error("[chatService] Error Details:", error.details);
        throw error;
    }

    console.log(`[chatService] Update successful. Rows affected: ${data?.length || 0}`);
    console.log(`[chatService] Final DB State:`, data);

    if (!data || data.length === 0) {
        console.warn("[chatService] No rows were updated. Check if the chatId exists and belongs to you.");
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
