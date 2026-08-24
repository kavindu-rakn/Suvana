import Link from "next/link";
import { AudioLines, Box, ArrowRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import SessionHistoryModel from "@/models/SessionHistory";
import { Card } from "@/components/ui/Card";
import { EmotionBadge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/Button";

export default async function DashboardOverviewPage() {
  const session = await auth();
  const firstName = session?.user?.name?.split(" ")[0] ?? "there";

  let history: Array<{
    _id: string;
    audioText: string;
    emotion?: string;
    glossSequence: Array<{ gloss?: string }>;
    createdAt: Date;
  }> = [];

  if (session?.user?.id) {
    await connectDB();
    const docs = await SessionHistoryModel.find({ userId: session.user.id })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
    history = JSON.parse(JSON.stringify(docs));
  }

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-2xl font-semibold">Welcome back, {firstName} 👋</h1>
        <p className="mt-1 text-foreground-muted">
          Pick a feature below to turn your voice into text, emotion, or sign language.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Card className="flex flex-col justify-between p-6">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <AudioLines size={20} />
            </div>
            <h2 className="mt-4 text-lg font-medium">Speech to Text</h2>
            <p className="mt-2 text-sm text-foreground-muted">
              Record or upload audio and get an instant transcript with detected emotion.
            </p>
          </div>
          <Link
            href="/dashboard/speech-to-text"
            className={`mt-6 w-fit ${buttonVariants("outline", "md")}`}
          >
            Open <ArrowRight size={15} />
          </Link>
        </Card>

        <Card className="flex flex-col justify-between p-6">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <Box size={20} />
            </div>
            <h2 className="mt-4 text-lg font-medium">Audio to Sign Model</h2>
            <p className="mt-2 text-sm text-foreground-muted">
              Speak or upload audio and watch a 3D avatar sign your words back to you.
            </p>
          </div>
          <Link
            href="/dashboard/sign-model"
            className={`mt-6 w-fit ${buttonVariants("outline", "md")}`}
          >
            Open <ArrowRight size={15} />
          </Link>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-medium">Recent sessions</h2>
        {history.length === 0 ? (
          <Card className="mt-4 p-6 text-sm text-foreground-muted">
            No sessions yet — your translations will show up here once you run one.
          </Card>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {history.map((h) => (
              <Card key={h._id} className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm">{h.audioText}</p>
                  <p className="mt-1 text-xs text-foreground-muted">
                    {new Date(h.createdAt).toLocaleString()}
                    {h.glossSequence?.length > 0 && ` · ${h.glossSequence.length} signs matched`}
                  </p>
                </div>
                {h.emotion && <EmotionBadge emotion={h.emotion} />}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
