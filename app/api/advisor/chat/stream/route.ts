import { NextRequest } from "next/server"
import { headers } from "next/headers"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ""

export async function POST(request: NextRequest) {
  const body = await request.text()

  // Easy Auth injects this server-side header when the user is signed in
  const headersList = await headers()
  const userToken = headersList.get("x-ms-token-aad-access-token") || ""

  const backendRes = await fetch(`${API_URL}/advisor/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-token": userToken,
    },
    body,
  })

  if (!backendRes.ok) {
    return new Response(
      JSON.stringify({ error: "Backend error", status: backendRes.status }),
      { status: backendRes.status, headers: { "Content-Type": "application/json" } }
    )
  }

  return new Response(backendRes.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  })
}
