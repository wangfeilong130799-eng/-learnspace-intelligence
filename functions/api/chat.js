export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    const body = await request.json();
    const message = body.message;

    if (!message || typeof message !== "string") {
      return Response.json(
        { error: "请输入你的问题。" },
        { status: 400 }
      );
    }

    if (!env.AI_API_KEY) {
      return Response.json(
        { error: "AI 服务尚未配置，请稍后再试。" },
        { status: 503 }
      );
    }

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.AI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "你是一名友好、严谨的 AI 学习助手。请用清晰易懂的中文帮助学生理解知识、分析问题和提升学习能力。"
            },
            {
              role: "user",
              content: message.slice(0, 8000)
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return Response.json(
        { error: "AI 服务暂时无法使用，请检查 API 配置。" },
        { status: 502 }
      );
    }

    return Response.json({
      answer: data.choices?.[0]?.message?.content || "暂时没有生成答案。"
    });
  } catch (error) {
    return Response.json(
      { error: "请求失败，请稍后重试。" },
      { status: 500 }
    );
  }
}
