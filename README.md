# local-ai-trace

本地 LLM 推理与 OpenAI 兼容 API，带 Web 观测面板。CLI 命令为 `lat`。

## 一行命令（npx，无需全局安装）

包已发布到 npm 后，可直接：

```bash
npx local-ai-trace start
```

指定端口：

```bash
npx local-ai-trace start --port 4321
```

其余子命令把前面的 `lat` 换成 `npx local-ai-trace` 即可，例如 `npx local-ai-trace model list`。若公司环境默认 registry 不是 npmjs，请配置能解析该包的源，或使用 `--registry https://registry.npmjs.org/`。

## 要求

- Node.js **22+**（建议使用当前 LTS）
- `node-llama-cpp` 可能需要对应平台的构建工具链；若安装失败请参阅 [node-llama-cpp](https://github.com/withcatai/node-llama-cpp) 文档

## 安装

```bash
npm install -g local-ai-trace
```

## 使用

```bash
lat start
# 指定端口
lat start --port 4321

lat model list
lat model add <id>
lat model remove <id>
lat model default <id>
```

启动后：

- OpenAI 兼容 Base URL：`http://localhost:<port>/v1`
- 观测面板：`http://localhost:<port>`

环境变量示例：

```bash
export OPENAI_BASE_URL=http://localhost:4321/v1
```

## 许可证

MIT — 见 [LICENSE](./LICENSE)。