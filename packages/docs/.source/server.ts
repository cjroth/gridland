// @ts-nocheck
import * as __fd_glob_28 from "../content/docs/guides/vite.mdx?collection=docs"
import * as __fd_glob_27 from "../content/docs/guides/theming.mdx?collection=docs"
import * as __fd_glob_26 from "../content/docs/guides/testing.mdx?collection=docs"
import * as __fd_glob_25 from "../content/docs/guides/nextjs.mdx?collection=docs"
import * as __fd_glob_24 from "../content/docs/components/text-input.mdx?collection=docs"
import * as __fd_glob_23 from "../content/docs/components/terminal-window.mdx?collection=docs"
import * as __fd_glob_22 from "../content/docs/components/table.mdx?collection=docs"
import * as __fd_glob_21 from "../content/docs/components/tab-bar.mdx?collection=docs"
import * as __fd_glob_20 from "../content/docs/components/status-bar.mdx?collection=docs"
import * as __fd_glob_19 from "../content/docs/components/spinner.mdx?collection=docs"
import * as __fd_glob_18 from "../content/docs/components/select-input.mdx?collection=docs"
import * as __fd_glob_17 from "../content/docs/components/primitives.mdx?collection=docs"
import * as __fd_glob_16 from "../content/docs/components/multi-select.mdx?collection=docs"
import * as __fd_glob_15 from "../content/docs/components/modal.mdx?collection=docs"
import * as __fd_glob_14 from "../content/docs/components/made-with-polyterm.mdx?collection=docs"
import * as __fd_glob_13 from "../content/docs/components/made-with-opentui.mdx?collection=docs"
import * as __fd_glob_12 from "../content/docs/components/link.mdx?collection=docs"
import * as __fd_glob_11 from "../content/docs/components/gradient.mdx?collection=docs"
import * as __fd_glob_10 from "../content/docs/components/chat.mdx?collection=docs"
import * as __fd_glob_9 from "../content/docs/components/canvas.mdx?collection=docs"
import * as __fd_glob_8 from "../content/docs/components/ascii.mdx?collection=docs"
import * as __fd_glob_7 from "../content/docs/api/polyterm-web.mdx?collection=docs"
import * as __fd_glob_6 from "../content/docs/api/polyterm-ui.mdx?collection=docs"
import * as __fd_glob_5 from "../content/docs/api/polyterm-testing.mdx?collection=docs"
import * as __fd_glob_4 from "../content/docs/index.mdx?collection=docs"
import { default as __fd_glob_3 } from "../content/docs/guides/meta.json?collection=docs"
import { default as __fd_glob_2 } from "../content/docs/components/meta.json?collection=docs"
import { default as __fd_glob_1 } from "../content/docs/api/meta.json?collection=docs"
import { default as __fd_glob_0 } from "../content/docs/meta.json?collection=docs"
import { server } from 'fumadocs-mdx/runtime/server';
import type * as Config from '../source.config';

const create = server<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>({"doc":{"passthroughs":["extractedReferences"]}});

export const docs = await create.docs("docs", "content/docs", {"meta.json": __fd_glob_0, "api/meta.json": __fd_glob_1, "components/meta.json": __fd_glob_2, "guides/meta.json": __fd_glob_3, }, {"index.mdx": __fd_glob_4, "api/polyterm-testing.mdx": __fd_glob_5, "api/polyterm-ui.mdx": __fd_glob_6, "api/polyterm-web.mdx": __fd_glob_7, "components/ascii.mdx": __fd_glob_8, "components/canvas.mdx": __fd_glob_9, "components/chat.mdx": __fd_glob_10, "components/gradient.mdx": __fd_glob_11, "components/link.mdx": __fd_glob_12, "components/made-with-opentui.mdx": __fd_glob_13, "components/made-with-polyterm.mdx": __fd_glob_14, "components/modal.mdx": __fd_glob_15, "components/multi-select.mdx": __fd_glob_16, "components/primitives.mdx": __fd_glob_17, "components/select-input.mdx": __fd_glob_18, "components/spinner.mdx": __fd_glob_19, "components/status-bar.mdx": __fd_glob_20, "components/tab-bar.mdx": __fd_glob_21, "components/table.mdx": __fd_glob_22, "components/terminal-window.mdx": __fd_glob_23, "components/text-input.mdx": __fd_glob_24, "guides/nextjs.mdx": __fd_glob_25, "guides/testing.mdx": __fd_glob_26, "guides/theming.mdx": __fd_glob_27, "guides/vite.mdx": __fd_glob_28, });