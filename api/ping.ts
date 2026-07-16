// Diagnostic function: confirms serverless functions route on this project.
export default function handler(_req: any, res: any) {
  res.status(200).json({ pong: true, hasKey: Boolean(process.env.SELEMENE_API_KEY) })
}
