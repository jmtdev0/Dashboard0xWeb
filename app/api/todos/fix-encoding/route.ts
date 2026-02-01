import { NextResponse } from "next/server";
import { validateToken } from "@/lib/auth-utils";
import { getAllTodos, saveTodos } from "@/lib/todos-storage";

/**
 * POST /api/todos/fix-encoding
 * Fixes corrupted UTF-8 encoding in existing todos
 * Requires valid Authorization token
 */
export async function POST(request: Request) {
  console.log("🔧 [FIX-ENCODING] Fix encoding request received");

  try {
    // Validate authentication
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token || !validateToken(token)) {
      console.log("❌ [FIX-ENCODING] Unauthorized");
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Get all todos
    const { todos } = await getAllTodos();
    console.log("📋 [FIX-ENCODING] Found", todos.length, "todos");

    // Fix encoding for each todo
    const fixedTodos = todos.map((todo) => {
      const originalText = todo.text;
      let fixedText = originalText;

      // Try to fix common UTF-8 corruption patterns
      // When UTF-8 is interpreted as Latin-1, we get these patterns
      try {
        // Check if the text contains corrupted characters
        if (/├▒|├│|├ş|├í|├ę|├║|├ü/.test(originalText)) {
          console.log("🔍 [FIX-ENCODING] Detected corrupted encoding in:", originalText);

          // Convert from corrupted display to proper UTF-8
          // This works by encoding as Latin-1 then decoding as UTF-8
          const bytes = new TextEncoder().encode(originalText);
          fixedText = new TextDecoder("utf-8", { fatal: false }).decode(bytes);

          // Additional manual fixes for common patterns
          fixedText = fixedText
            .replace(/Ã±/g, 'ñ')
            .replace(/Ã³/g, 'ó')
            .replace(/Ã¡/g, 'á')
            .replace(/Ã©/g, 'é')
            .replace(/Ã­/g, 'í')
            .replace(/Ãº/g, 'ú')
            .replace(/Ã/g, 'ü')
            .replace(/Ã'/g, 'Ñ')
            .replace(/Ã"/g, 'Ó')
            .replace(/Ã/g, 'Á')
            .replace(/Ã‰/g, 'É')
            .replace(/Ã/g, 'Í')
            .replace(/Ãš/g, 'Ú')
            .replace(/Ãœ/g, 'Ü')
            .replace(/├▒/g, 'ñ')
            .replace(/├│/g, 'ó')
            .replace(/├í/g, 'á')
            .replace(/├ę/g, 'é')
            .replace(/├ş/g, 'í')
            .replace(/├║/g, 'ú')
            .replace(/├ü/g, 'ü');

          console.log("✅ [FIX-ENCODING] Fixed:", originalText, "→", fixedText);
        }
      } catch (error) {
        console.error("❌ [FIX-ENCODING] Error fixing text:", originalText, error);
      }

      return {
        ...todo,
        text: fixedText,
      };
    });

    // Count how many were fixed
    const fixedCount = fixedTodos.filter(
      (todo, index) => todo.text !== todos[index].text
    ).length;

    console.log("🔧 [FIX-ENCODING] Fixed", fixedCount, "todos");

    // Save the fixed todos
    await saveTodos(fixedTodos);
    console.log("💾 [FIX-ENCODING] Saved fixed todos");

    return NextResponse.json(
      {
        success: true,
        totalTodos: todos.length,
        fixedCount,
        message: `Fixed ${fixedCount} out of ${todos.length} todos`,
      },
      {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      }
    );
  } catch (error) {
    console.error("❌ [FIX-ENCODING] Error:", error);
    return NextResponse.json(
      { error: "Failed to fix encoding" },
      { status: 500 }
    );
  }
}
