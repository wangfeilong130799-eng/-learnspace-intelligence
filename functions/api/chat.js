export async function onRequestPost(context) {
  const { request, env } = context;

  const workerUrl =
    "https://learnspace-ai-proxy.wangfeilong130799.workers.dev/api/chat";

  if (!env.PROXY_KEY) {
    return Response.json(
      { error: "服务器尚未配置 PROXY_KEY" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const message = body?.message;

    if (typeof message !== "string" || !message.trim()) {
      return Response.json(
        { error: "请输入有效的问题" },
        { status: 400 }
      );
    }

    if (message.length > 8000) {
      return Response.json(
        { error: "问题过长，请缩短后重试" },
        { status: 400 }
      );
    }

    const response = await fetch(workerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.PROXY_KEY}`
      },
      body: JSON.stringify({
        message: message.trim()
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("AI proxy request failed:", response.status);

      return Response.json(
        {
          error:
            typeof data?.error === "string"
              ? data.error
              : "AI 服务暂时不可用，请稍后重试"
        },
        { status: response.status >= 500 ? 502 : response.status }
      );
    }

    if (typeof data?.reply !== "string" || !data.reply.trim()) {
      return Response.json(
        { error: "AI 服务返回的数据格式不正确" },
        { status: 502 }
      );
    }

    return Response.json(
      { reply: data.reply },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  } catch (error) {
    console.error("Pages Function failed:", error?.name || "Error");

    return Response.json(
      { error: "请求失败，请稍后重试" },
      { status: 502 }
    );
  }
}