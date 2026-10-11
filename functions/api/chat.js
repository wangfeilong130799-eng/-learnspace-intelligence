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
    const message = body.message;

    if (typeof message !== "string" || !message.trim()) {
      return Response.json(
        { error: "请输入问题后再试" },
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
      return Response.json(
        { error: "AI 服务暂时不可用，请稍后重试" },
        {
          status: response.status >= 500
            ? 502
            : response.status
        }
      );
    }

    return Response.json({
      reply: data.reply
    });
  } catch {
    return Response.json(
      { error: "请求失败，请稍后重试" },
      { status: 500 }
    );
  }
}