export async function onRequestPost(context) {
  const { request, env } = context;

  const WORKER_URL =
    "https://learnspace-ai-proxy.wangfeilong130799.workers.dev/api/chat";

  // 检查服务器密钥是否配置
  if (!env.PROXY_KEY) {
    return Response.json(
      { error: "服务器尚未配置 PROXY_KEY，请检查 Cloudflare Pages 环境变量。" },
      { status: 500 }
    );
  }

  try {
    // 解析请求
    let body;

    try {
      body = await request.json();
    } catch {
      return Response.json(
        { error: "请求格式错误，请重新输入问题。" },
        { status: 400 }
      );
    }

    const message = body?.message;

    // 验证输入
    if (typeof message !== "string" || !message.trim()) {
      return Response.json(
        { error: "请输入问题后再试。" },
        { status: 400 }
      );
    }

    if (message.length > 8000) {
      return Response.json(
        { error: "问题过长，请将内容控制在 8000 个字符以内。" },
        { status: 400 }
      );
    }

    // 请求 AI Worker
    const upstreamResponse = await fetch(WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.PROXY_KEY}`
      },
      body: JSON.stringify({
        message: message.trim()
      })
    });

    // 解析 Worker 响应
    let data;

    try {
      data = await upstreamResponse.json();
    } catch {
      return Response.json(
        { error: "AI 服务返回了无效数据，请稍后重试。" },
        { status: 502 }
      );
    }

    // 处理上游错误
    if (!upstreamResponse.ok) {
      console.error("AI Worker returned status:", upstreamResponse.status);

      return Response.json(
        {
          error: upstreamResponse.status === 401 ||
                upstreamResponse.status === 403
            ? "AI 服务认证失败，请检查服务器密钥配置。"
            : "AI 服务暂时不可用，请稍后重试。"
        },
        { status: 502 }
      );
    }

    // 验证 AI 回答
    if (typeof data.reply !== "string" || !data.reply.trim()) {
      return Response.json(
        { error: "AI 暂时没有返回有效回答，请重试。" },
        { status: 502 }
      );
    }

    // 返回前端需要的数据
    return Response.json(
      { reply: data.reply },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );

  } catch (error) {
    console.error("Chat API error:", error);

    return Response.json(
      { error: "请求失败，请检查网络后重试。" },
      { status: 500 }
    );
  }
}