import { useMemo, useState } from "react";

type MailLabel = "收件箱" | "已加星标" | "已发送" | "草稿" | "垃圾箱";

type Mail = {
  id: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  preview: string;
  content: string;
  time: string;
  unread: boolean;
  starred: boolean;
  label: MailLabel;
};

const SAMPLE_MAILS: Mail[] = [
  {
    id: "m1",
    fromName: "系统通知",
    fromEmail: "no-reply@testmail.local",
    subject: "欢迎使用 TestMail",
    preview: "这是一个简易邮箱页面示例：左侧列表，右侧详情。",
    content:
      "欢迎使用 TestMail。\n\n这是一个简易邮箱页面示例：\n- 左侧：邮件列表 + 搜索\n- 右侧：邮件详情\n- 支持：未读/星标/删除（本地状态）\n\n你可以把它接到真实后端接口。",
    time: "今天 10:12",
    unread: true,
    starred: true,
    label: "收件箱"
  },
  {
    id: "m2",
    fromName: "产品运营",
    fromEmail: "ops@testmail.local",
    subject: "本周更新：更快的搜索与更清晰的布局",
    preview: "我们优化了列表筛选与详情排版，阅读体验更好。",
    content:
      "本周更新要点：\n\n1) 列表筛选更快\n2) 详情阅读更舒适\n3) 操作更直观\n\n如有反馈请回复本邮件。",
    time: "昨天 18:40",
    unread: false,
    starred: false,
    label: "收件箱"
  },
  {
    id: "m3",
    fromName: "我",
    fromEmail: "me@testmail.local",
    subject: "（草稿）下周计划",
    preview: "把简易邮箱页面接到 API，并增加分页。",
    content: "TODO：\n- 接 API\n- 增加分页\n- 增加多选批量操作\n",
    time: "5/9 09:03",
    unread: false,
    starred: false,
    label: "草稿"
  }
];

const LABELS: { id: MailLabel; name: string }[] = [
  { id: "收件箱", name: "收件箱" },
  { id: "已加星标", name: "已加星标" },
  { id: "已发送", name: "已发送" },
  { id: "草稿", name: "草稿" },
  { id: "垃圾箱", name: "垃圾箱" }
];

export function MailboxPage() {
  const [activeLabel, setActiveLabel] = useState<MailLabel>("收件箱");
  const [query, setQuery] = useState("");
  const [mails, setMails] = useState<Mail[]>(SAMPLE_MAILS);
  const [activeId, setActiveId] = useState<string>(SAMPLE_MAILS[0]?.id ?? "");

  const filteredMails = useMemo(() => {
    const q = query.trim().toLowerCase();
    return mails
      .filter((m) => {
        if (activeLabel === "已加星标") return m.starred && m.label !== "垃圾箱";
        return m.label === activeLabel;
      })
      .filter((m) => {
        if (!q) return true;
        return (
          m.subject.toLowerCase().includes(q) ||
          m.fromName.toLowerCase().includes(q) ||
          m.fromEmail.toLowerCase().includes(q) ||
          m.preview.toLowerCase().includes(q)
        );
      });
  }, [activeLabel, mails, query]);

  const activeMail = useMemo(() => mails.find((m) => m.id === activeId) ?? null, [activeId, mails]);

  function openMail(id: string) {
    setActiveId(id);
    setMails((prev) => prev.map((m) => (m.id === id ? { ...m, unread: false } : m)));
  }

  function toggleStar(id: string) {
    setMails((prev) => prev.map((m) => (m.id === id ? { ...m, starred: !m.starred } : m)));
  }

  function moveToTrash(id: string) {
    setMails((prev) => prev.map((m) => (m.id === id ? { ...m, label: "垃圾箱" } : m)));
    if (activeId === id) {
      const next = filteredMails.find((m) => m.id !== id)?.id ?? "";
      setActiveId(next);
    }
  }

  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="grid size-9 place-items-center rounded-xl bg-slate-800/70 ring-1 ring-slate-700">
              <span className="text-sm font-semibold">TM</span>
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">TestMail</div>
              <div className="text-xs text-slate-400">简易邮箱页面</div>
            </div>
          </div>

          <div className="ml-auto w-full max-w-md">
            <div className="flex items-center gap-2 rounded-xl bg-slate-900/60 px-3 py-2 ring-1 ring-slate-800">
              <span className="select-none text-slate-400">⌕</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索主题 / 发件人 / 预览..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="rounded-lg px-2 py-1 text-xs text-slate-300 hover:bg-slate-800/60"
                >
                  清除
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-12 gap-4 px-4 py-4">
        <aside className="col-span-12 md:col-span-3">
          <div className="rounded-2xl bg-slate-900/40 p-2 ring-1 ring-slate-800">
            <div className="px-2 pb-2 pt-1 text-xs font-medium text-slate-400">邮箱</div>
            <nav className="space-y-1">
              {LABELS.map((l) => {
                const isActive = l.id === activeLabel;
                const count =
                  l.id === "已加星标"
                    ? mails.filter((m) => m.starred && m.label !== "垃圾箱").length
                    : mails.filter((m) => m.label === l.id).length;
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setActiveLabel(l.id)}
                    className={[
                      "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm",
                      isActive ? "bg-slate-800/70 ring-1 ring-slate-700" : "hover:bg-slate-800/40"
                    ].join(" ")}
                  >
                    <span className={isActive ? "font-semibold" : "text-slate-200"}>{l.name}</span>
                    <span className="rounded-lg bg-slate-950/40 px-2 py-0.5 text-xs text-slate-400 ring-1 ring-slate-800">
                      {count}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        <section className="col-span-12 md:col-span-4">
          <div className="rounded-2xl bg-slate-900/40 ring-1 ring-slate-800">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 px-4 py-3">
              <div className="text-sm font-semibold">{activeLabel === "已加星标" ? "星标" : activeLabel}</div>
              <div className="text-xs text-slate-400">{filteredMails.length} 封</div>
            </div>

            <div className="max-h-[calc(100dvh-12rem)] overflow-auto">
              {filteredMails.length ? (
                <ul className="divide-y divide-slate-800">
                  {filteredMails.map((m) => {
                    const isActive = m.id === activeId;
                    return (
                      <li key={m.id}>
                        <button
                          type="button"
                          onClick={() => openMail(m.id)}
                          className={[
                            "w-full px-4 py-3 text-left transition",
                            isActive ? "bg-slate-800/60" : "hover:bg-slate-800/30"
                          ].join(" ")}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={m.unread ? "font-semibold" : "text-slate-200"}>{m.fromName}</span>
                                {m.unread ? (
                                  <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-[11px] text-sky-300 ring-1 ring-sky-500/30">
                                    未读
                                  </span>
                                ) : null}
                              </div>
                              <div className={["mt-1 truncate text-sm", m.unread ? "font-semibold" : ""].join(" ")}>
                                {m.subject}
                              </div>
                              <div className="mt-1 truncate text-xs text-slate-400">{m.preview}</div>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-2">
                              <div className="text-xs text-slate-400">{m.time}</div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleStar(m.id);
                                }}
                                className={[
                                  "rounded-lg px-2 py-1 text-xs ring-1 transition",
                                  m.starred
                                    ? "bg-amber-500/10 text-amber-300 ring-amber-500/30 hover:bg-amber-500/15"
                                    : "bg-slate-950/30 text-slate-300 ring-slate-800 hover:bg-slate-800/40"
                                ].join(" ")}
                              >
                                {m.starred ? "已星标" : "星标"}
                              </button>
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="px-4 py-10 text-center text-sm text-slate-400">没有匹配的邮件</div>
              )}
            </div>
          </div>
        </section>

        <section className="col-span-12 md:col-span-5">
          <div className="rounded-2xl bg-slate-900/40 ring-1 ring-slate-800">
            {activeMail ? (
              <>
                <div className="border-b border-slate-800 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-base font-semibold">{activeMail.subject}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                        <span className="text-slate-200">{activeMail.fromName}</span>
                        <span>·</span>
                        <span className="truncate">{activeMail.fromEmail}</span>
                        <span>·</span>
                        <span>{activeMail.time}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleStar(activeMail.id)}
                        className={[
                          "rounded-xl px-3 py-2 text-xs ring-1 transition",
                          activeMail.starred
                            ? "bg-amber-500/10 text-amber-300 ring-amber-500/30 hover:bg-amber-500/15"
                            : "bg-slate-950/30 text-slate-200 ring-slate-800 hover:bg-slate-800/40"
                        ].join(" ")}
                      >
                        {activeMail.starred ? "取消星标" : "设为星标"}
                      </button>
                      <button
                        type="button"
                        onClick={() => moveToTrash(activeMail.id)}
                        className="rounded-xl bg-rose-500/10 px-3 py-2 text-xs text-rose-200 ring-1 ring-rose-500/25 transition hover:bg-rose-500/15"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </div>

                <div className="px-4 py-4">
                  <pre className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-100">
                    {activeMail.content}
                  </pre>
                </div>
              </>
            ) : (
              <div className="px-4 py-16 text-center text-sm text-slate-400">请选择一封邮件</div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

