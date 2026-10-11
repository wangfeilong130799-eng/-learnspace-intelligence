export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };

    const json = (data, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store"
        }
      });

    // 浏览器预检请求
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    // 检查服务状态
    if (request.method === "GET") {
      return json({
        status: "online",
        service: "LearnSpace AI Proxy"
      });
    }

    // 只允许 POST 请求调用 AI
    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    // 验证代理密钥
    if (!env.PROXY_KEY) {
      return json({ error: "Worker 未配置 PROXY_KEY" }, 500);
    }

    const authorization = request.headers.get("Authorization");

    if (authorization !== `Bearer ${env.PROXY_KEY}`) {
      return json({ error: "Unauthorized" }, 401);
    }

    // 验证 OpenAI 密钥
    if (!env.OPENAI_API_KEY) {
      return json({ error: "Worker 未配置 OPENAI_API_KEY" }, 500);
    }

    try {
      const body = await request.json();
      const message = body?.message;

      if (typeof message !== "string" || !message.trim()) {
        return json({ error: "请输入有效的问题" }, 400);
      }

      if (message.length > 8000) {
        return json({ error: "问题过长，请缩短后重试" }, 400);
      }

      // 调用 OpenAI
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content:
                  "你是 LearnSpace Intelligence 的 AI 学习助手。请用清晰、友好、准确的中文帮助学生和教师理解知识、规划学习及改进写作。对于作业，请重视讲解思路和培养独立思考。"
              },
              {
                role: "user",
                content: message.trim()
              }
            ]
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        // 记录错误状态，不记录密钥或用户问题
        console.error("OpenAI request failed:", {
          status: response.status,
          errorType: data?.error?.type || "unknown",
          errorCode: data?.error?.code || "unknown"
        });

        if (response.status === 401) {
          return json({ error: "OpenAI API 密钥无效或未获授权" }, 502);
        }

        if (response.status === 429) {
          return json({ error: "OpenAI 请求受限，请检查 API 额度或使用限制" }, 502);
        }

        return json({ error: "OpenAI 请求失败，请检查模型权限和服务状态" }, 502);
      }

      const reply = data?.choices?.[0]?.message?.content;

      if (typeof reply !== "string" || !reply.trim()) {
        return json({ error: "OpenAI 没有返回有效回答" }, 502);
      }

      return json({ reply });
    } catch (error) {
      console.error("Worker request failed:", error?.name || "Error");
      return json({ error: "AI 服务请求失败，请稍后重试" }, 502);
    }
  }
};