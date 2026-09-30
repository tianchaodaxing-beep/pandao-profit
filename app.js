(function () {
  "use strict";
  const U = Pandao,
    B = Business;
  const app = U.mount({
    title: "成本与利润测算器",
    icon: "¥",
    category: "经营测算",
    description:
      "单品测算、批量计算与价格情景比较。适用于电商、餐饮、制造和服务业务。",
    repo: "https://github.com/tianchaodaxing-beep/pandao-profit",
  });
  const template = [
    {
      名称: "演示商品",
      售价: 120,
      数量: 100,
      采购成本: 30,
      采购汇率: 1,
      物流单件成本: 8,
      其他单件成本: 2,
      平台费率: 10,
      广告费用: 500,
      固定费用: 300,
    },
  ];
  const defaults = {
    name: "演示商品",
    currency: "人民币",
    price: 120,
    quantity: 100,
    purchase: 30,
    exchange: 1,
    shipping: 8,
    other: 2,
    feeRate: 10,
    ads: 500,
    fixed: 300,
  };
  const labels = {
    name: "商品或服务名称",
    currency: "报告币种",
    price: "售价（报告币/件）",
    quantity: "销售数量",
    purchase: "采购成本（采购币/件）",
    exchange: "采购汇率（1采购币兑换报告币）",
    shipping: "物流成本（报告币/件）",
    other: "其他成本（报告币/件）",
    feeRate: "平台费率（%）",
    ads: "广告费用（报告币）",
    fixed: "固定费用（报告币）",
  };
  const form = U.h("form", { id: "profit-form" }),
    grid = U.h("div", { class: "grid" });
  for (const [k, v] of Object.entries(defaults)) {
    const f = U.field(
      labels[k],
      k,
      v,
      ["name", "currency"].includes(k) ? "text" : "number",
    );
    if (k === "exchange") f.wrap.classList.add("wide");
    grid.append(f.wrap);
  }
  form.append(grid);
  const p = U.panel("测算输入");
  p.append(
    form,
    U.actions(
      U.button("计算利润", U.run(calculate), true),
      U.button("恢复演示", () => {
        for (const [k, v] of Object.entries(defaults))
          form.elements[k].value = v;
        U.source("演示数据");
        calculate();
      }),
    ),
  );
  app.input.append(p);
  let exports = [];
  const output = U.panel("测算结果");
  app.output.append(output);
  const batch = U.panel("批量结果");
  app.output.append(batch);
  function calculate() {
    const r = U.values(form),
      v = B.profit(r);
    U.clear(output).append(
      U.h("h2", { text: r.name + " · 测算结果" }),
      U.metrics([
        ["测算利润", U.money(v.profit), r.currency],
        ["利润率", v.margin === null ? "—" : v.margin + "%", ""],
        ["单件利润", U.money(v.unitProfit), r.currency],
      ]),
      U.table(
        [
          { key: "item", label: "费用项目", translate: true },
          { key: "value", label: "金额", number: true },
        ],
        [
          ["销售收入", v.revenue],
          ["采购、物流及其他成本", v.cost],
          ["平台费用", v.fees],
          ["广告费用", v.ads],
          ["固定费用", v.fixed],
        ].map(([item, value]) => ({ item, value: U.money(value) })),
      ),
      U.h("p", {
        class: "hint",
        text:
          "收支平衡销量：" +
          (v.breakEvenQuantity === null
            ? "当前售价无法覆盖单件成本"
            : v.breakEvenQuantity + " 件"),
      }),
    );
    const scenarios = [0.9, 1, 1.1].map((mult) => {
      const price = B.round(Number(r.price) * mult),
        s = B.profit({ ...r, price });
      return {
        售价: price,
        测算利润: s.profit,
        利润率: s.margin === null ? "" : s.margin + "%",
      };
    });
    output.append(
      U.h("div", { class: "divider" }),
      U.h("h3", { text: "售价情景比较" }),
      U.table(["售价", "测算利润", "利润率"], scenarios),
      U.actions(
        U.button("导出测算结果", () =>
          U.exportRows("利润测算.xlsx", [
            {
              名称: r.name,
              币种: r.currency,
              ...Object.fromEntries([
                ["销售收入", v.revenue],
                ["总单件成本", v.cost],
                ["平台费用", v.fees],
                ["广告费用", v.ads],
                ["固定费用", v.fixed],
                ["测算利润", v.profit],
                ["利润率", v.margin],
              ]),
            },
          ]),
        ),
      ),
    );
    U.source("手动测算：" + r.name);
  }
  const mapping = {
    name: "名称",
    price: "售价",
    quantity: "数量",
    purchase: "采购成本",
    exchange: "采购汇率",
    shipping: "物流单件成本",
    other: "其他单件成本",
    feeRate: "平台费率",
    ads: "广告费用",
    fixed: "固定费用",
  };
  app.input.append(
    U.dataPanel("批量测算", template, (data) => {
      exports = data.rows.map((row, index) => {
        try {
          const r = Object.fromEntries(
            Object.entries(mapping).map(([k, c]) => [k, row[c]]),
          );
          const v = B.profit(r);
          return {
            名称: r.name || "第" + (index + 2) + "行",
            销售收入: v.revenue,
            总单件成本: v.cost,
            平台费用: v.fees,
            广告费用: v.ads,
            固定费用: v.fixed,
            测算利润: v.profit,
            利润率: v.margin === null ? "" : v.margin + "%",
            结果: "已计算",
          };
        } catch (e) {
          return {
            名称: row["名称"] || "第" + (index + 2) + "行",
            结果: e.message,
          };
        }
      });
      U.clear(batch).append(
        U.h("h2", { text: "批量结果" }),
        U.table(["名称", "销售收入", "测算利润", "利润率", "结果"], exports),
        U.actions(
          U.button("导出批量结果", () =>
            U.exportRows("批量利润.xlsx", exports),
          ),
        ),
      );
    }),
  );
  calculate();
  U.source("演示数据");
})();
