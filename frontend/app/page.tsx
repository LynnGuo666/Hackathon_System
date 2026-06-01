import Link from "next/link";
import { Button, Card, CardBody, CardHeader } from "@heroui/react";
import { LogIn, Map, UserRoundPen } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-divider bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3">
          <div>
            <p className="text-sm text-foreground/60">Hackathon</p>
            <h1 className="text-lg font-semibold">公众入口</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button as={Link} href="/login" variant="flat" startContent={<UserRoundPen size={16} />}>
              填写信息
            </Button>
            <Button as={Link} href="/login" color="primary" startContent={<LogIn size={16} />}>
              登录
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="grid content-start gap-4">
          <p className="text-sm text-foreground/60">参赛者服务</p>
          <h2 className="max-w-3xl text-4xl font-semibold leading-tight">
            先用邮箱进入系统，现场签到后绑定 CheckinID。
          </h2>
          <p className="max-w-2xl text-foreground/65">
            公众页面只保留报名与登录入口；登录后进入选手工作台，管理员从独立后台管理资源、邮件队列和发放记录。
          </p>
          <div className="flex flex-wrap gap-3">
            <Button as={Link} href="/login" color="primary" startContent={<UserRoundPen size={17} />}>
              填写信息
            </Button>
            <Button as={Link} href="/navigation" variant="flat" startContent={<Map size={17} />}>
              查看现场导航
            </Button>
          </div>
        </div>

        <Card className="rounded-md">
          <CardHeader>
            <h3 className="font-semibold">入口分工</h3>
          </CardHeader>
          <CardBody className="gap-3 text-sm text-foreground/70">
            <p>公众：访问首页，右上角填写信息或登录。</p>
            <p>选手：登录后查看身份、签到、资源领取。</p>
            <p>管理员：进入后台维护资源池、发放记录和邮件队列。</p>
          </CardBody>
        </Card>
      </section>
    </main>
  );
}
