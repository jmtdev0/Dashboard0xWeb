import { NextResponse } from "next/server";
import { validateToken } from "@/lib/auth-utils";
import { getAllEvents, saveEvents, generateEventId } from "@/lib/events-storage";
import { CalendarEvent } from "@/lib/types/event";

function validateRequest(request: Request): boolean {
  console.log("🔐 [EVENTS] Validating request...");

  const authHeader = request.headers.get("authorization");
  let token = authHeader?.replace("Bearer ", "");

  if (!token) {
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      const cookies = Object.fromEntries(
        cookieHeader.split("; ").map((c) => {
          const [key, ...v] = c.split("=");
          return [key, v.join("=")];
        })
      );
      token = cookies["auth_token"];
      if (token) {
        console.log("🍪 [EVENTS] Using token from cookie");
      }
    }
  } else {
    console.log("🔑 [EVENTS] Using Bearer token");
  }

  if (!token) {
    console.log("⚠️ [EVENTS] No token provided");
    return false;
  }

  const isValid = validateToken(token);
  console.log("✓ [EVENTS] Token valid:", isValid);

  return isValid;
}

export async function GET(request: Request) {
  console.log("📅 [EVENTS] GET request received");
  try {
    if (!validateRequest(request)) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const data = await getAllEvents();
    return NextResponse.json(data);
  } catch (error) {
    console.error("❌ [EVENTS] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  console.log("📅 [EVENTS] POST request received");
  try {
    if (!validateRequest(request)) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, date, description } = body;

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    if (title.trim().length > 200) {
      return NextResponse.json(
        { error: "Title too long (max 200 characters)" },
        { status: 400 }
      );
    }

    if (!date || isNaN(new Date(date).getTime())) {
      return NextResponse.json(
        { error: "Valid date is required" },
        { status: 400 }
      );
    }

    if (description && typeof description === "string" && description.length > 1000) {
      return NextResponse.json(
        { error: "Description too long (max 1000 characters)" },
        { status: 400 }
      );
    }

    const { events } = await getAllEvents();

    if (events.length >= 100) {
      return NextResponse.json(
        { error: "Maximum event limit reached (100)" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const newEvent: CalendarEvent = {
      id: generateEventId(),
      title: title.trim(),
      date: new Date(date).toISOString(),
      description: description?.trim() || null,
      createdAt: now,
      updatedAt: now,
    };

    events.push(newEvent);
    await saveEvents(events);

    return NextResponse.json(newEvent, { status: 201 });
  } catch (error) {
    console.error("❌ [EVENTS] POST error:", error);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  console.log("📅 [EVENTS] PUT request received");
  try {
    if (!validateRequest(request)) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, title, date, description } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Event ID is required" },
        { status: 400 }
      );
    }

    if (title !== undefined && (typeof title !== "string" || title.trim().length === 0)) {
      return NextResponse.json(
        { error: "Title cannot be empty" },
        { status: 400 }
      );
    }

    if (title && title.trim().length > 200) {
      return NextResponse.json(
        { error: "Title too long (max 200 characters)" },
        { status: 400 }
      );
    }

    if (date !== undefined && isNaN(new Date(date).getTime())) {
      return NextResponse.json(
        { error: "Invalid date" },
        { status: 400 }
      );
    }

    if (description !== undefined && description !== null && typeof description === "string" && description.length > 1000) {
      return NextResponse.json(
        { error: "Description too long (max 1000 characters)" },
        { status: 400 }
      );
    }

    const { events } = await getAllEvents();
    const eventIndex = events.findIndex((e) => e.id === id);

    if (eventIndex === -1) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    const updatedEvent: CalendarEvent = {
      ...events[eventIndex],
      ...(title !== undefined && { title: title.trim() }),
      ...(date !== undefined && { date: new Date(date).toISOString() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      updatedAt: new Date().toISOString(),
    };

    events[eventIndex] = updatedEvent;
    await saveEvents(events);

    return NextResponse.json(updatedEvent);
  } catch (error) {
    console.error("❌ [EVENTS] PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update event" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  console.log("📅 [EVENTS] DELETE request received");
  try {
    if (!validateRequest(request)) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Event ID is required" },
        { status: 400 }
      );
    }

    const { events } = await getAllEvents();
    const filteredEvents = events.filter((e) => e.id !== id);

    if (filteredEvents.length === events.length) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    await saveEvents(filteredEvents);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ [EVENTS] DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete event" },
      { status: 500 }
    );
  }
}
