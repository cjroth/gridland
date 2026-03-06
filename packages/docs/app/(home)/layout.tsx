import { HomeLayout } from "fumadocs-ui/layouts/home"
import type { ReactNode } from "react"

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <HomeLayout
      nav={{ title: "gridland" }}
      links={[
        { text: "Docs", url: "/docs" },
        {
          text: "GitHub",
          url: "https://github.com/cjroth/gridland",
          external: true,
        },
      ]}
    >
      {children}
    </HomeLayout>
  )
}
