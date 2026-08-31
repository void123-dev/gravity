import { intervalMs } from "./gravity";
import type { CouplingId, GravitySnapshot, Interval, NetAgree, PullDir, RegimeId } from "./types";
import { formatPct, formatUsdCompact } from "./utils";

export type Lang = "ru" | "en";

const REGIME: Record<Lang, Record<RegimeId, string>> = {
  ru: {
    lev_rally: "Ралли на леверидже",
    short_squeeze: "Шорт-сквиз",
    short_dump: "Шорт-давление",
    long_liq: "Каскад лонгов",
    spot_bid: "Спрос на споте",
    spot_offer: "Распродажа спота",
    coupled: "Рынки сцеплены",
  },
  en: {
    lev_rally: "Leverage-driven rally",
    short_squeeze: "Short squeeze",
    short_dump: "Short-led selloff",
    long_liq: "Long liquidation",
    spot_bid: "Spot demand",
    spot_offer: "Spot distribution",
    coupled: "Markets coupled",
  },
};

const COUPLING: Record<Lang, Record<CouplingId, string>> = {
  ru: {
    sync_up: "Синхронно вверх",
    sync_down: "Синхронно вниз",
    fight: "Борются",
    spot_alone: "Тянет только спот",
    perp_alone: "Тянут только перпы",
    quiet: "Нет вектора",
  },
  en: {
    sync_up: "In sync upward",
    sync_down: "In sync downward",
    fight: "Fighting",
    spot_alone: "Spot pulling alone",
    perp_alone: "Perps pulling alone",
    quiet: "No vector",
  },
};

const COUPLING_SHORT: Record<Lang, Record<CouplingId, string>> = {
  ru: {
    sync_up: "синхр ↑",
    sync_down: "синхр ↓",
    fight: "борьба",
    spot_alone: "спот",
    perp_alone: "перпы",
    quiet: "тихо",
  },
  en: {
    sync_up: "sync ↑",
    sync_down: "sync ↓",
    fight: "fight",
    spot_alone: "spot",
    perp_alone: "perps",
    quiet: "quiet",
  },
};

const DIR: Record<Lang, Record<PullDir, string>> = {
  ru: { up: "вверх", down: "вниз", flat: "нейтрально" },
  en: { up: "up", down: "down", flat: "flat" },
};

export const ui = {
  ru: {
    product: "GRAVITY",
    tag: "Spot–Perp Discovery",
    sub: "Кто тянет цену и в какую сторону — спот или бессрочные.",
    spot: "Спот",
    perp: "Перпы",
    leadingNow: "Ведёт сейчас",
    window: "Окно",
    interval: "Таймфрейм",
    tfScan: "Все таймфреймы",
    live: "OKX live",
    demo: "Демо-поток",
    confidence: "Уверенность",
    basis: "Базис",
    funding: "Funding",
    oi: "Open interest",
    oiDelta: "Δ OI",
    price: "Цена",
    components: "Вклад в индекс",
    lead: "Lead-lag",
    basisComp: "Базис",
    flow: "Агрессия",
    oiComp: "OI-импульс",
    volComp: "Объём",
    method: "Методика GDI-1.3",
    hideMethod: "Скрыть методику",
    lagSpot: "Спот отстаёт на",
    lagPerp: "Перпы отстают на",
    lagTied: "Лаг не выражен",
    bars: "бар.",
    share: "доля влияния",
    ribbon: "Кто вёл бар",
    gIndex: "Gravity",
    refresh: "Обновление 15 с",
    loading: "Считаем гравитацию рынков…",
    error: "Не удалось посчитать индекс. Пробуем ещё раз.",
    retry: "Повторить",
    syncing: "Синхронизация…",
    syncFresh: "Только что синхронизировано",
    syncIn: "До обновления",
    vectors: "Векторы давления",
    pullRibbon: "Направление по барам",
    sync: "Синхронно",
    fight: "Борются",
    force: "сила",
    takerBuy: "taker-покупка",
    takerSell: "taker-продажа",
    takerMixed: "поток смешанный",
    takerFlow: "поток taker",
    takerNone: "нет данных потока",
    takerNoteSpot: "taker в USDT за окно, не число ордеров",
    takerNotePerp: "taker buy/sell, не открытые лонги и шорты",
    volume: "Объём",
    volWindow: "Объём на окне",
    volVsAvg: "к среднему",
    volShare: "доля активности",
    volNotional: "номинал",
    volEq: "активность",
    volChart: "Объём vs свой средний",
    volLast: "последний бар",
    netVector: "Результирующий вектор",
    netSum: "спот + перпы",
    priceAgo: "назад",
    priceNow: "сейчас",
    barMove: "ход бара",
    agreeHit: "Вектор совпал с ценой",
    agreeMiss: "Вектор и цена разошлись",
    agreeWeak: "Нетто слабый — ход бара неявный",
  },
  en: {
    product: "GRAVITY",
    tag: "Spot–Perp Discovery",
    sub: "Who is pulling price, and which way — spot or perps.",
    spot: "Spot",
    perp: "Perps",
    leadingNow: "Leading now",
    window: "Window",
    interval: "Timeframe",
    tfScan: "All timeframes",
    live: "OKX live",
    demo: "Demo feed",
    confidence: "Confidence",
    basis: "Basis",
    funding: "Funding",
    oi: "Open interest",
    oiDelta: "Δ OI",
    price: "Price",
    components: "Index contributions",
    lead: "Lead-lag",
    basisComp: "Basis",
    flow: "Aggression",
    oiComp: "OI impulse",
    volComp: "Volume",
    method: "GDI-1.3 method",
    hideMethod: "Hide method",
    lagSpot: "Spot lags by",
    lagPerp: "Perps lag by",
    lagTied: "No clear lag",
    bars: "bars",
    share: "influence share",
    ribbon: "Who led the bar",
    gIndex: "Gravity",
    refresh: "Refresh 15s",
    loading: "Measuring market gravity…",
    error: "Could not compute the index. Retrying.",
    retry: "Retry",
    syncing: "Syncing…",
    syncFresh: "Just synced",
    syncIn: "Next update in",
    vectors: "Pull vectors",
    pullRibbon: "Direction by bar",
    sync: "In sync",
    fight: "Fighting",
    force: "force",
    takerBuy: "taker buying",
    takerSell: "taker selling",
    takerMixed: "mixed flow",
    takerFlow: "taker flow",
    takerNone: "no flow data",
    takerNoteSpot: "taker in USDT over the window, not order count",
    takerNotePerp: "taker buy/sell, not open longs vs shorts",
    volume: "Volume",
    volWindow: "Volume over window",
    volVsAvg: "vs average",
    volShare: "activity share",
    volNotional: "notional",
    volEq: "activity",
    volChart: "Volume vs own average",
    volLast: "last bar",
    netVector: "Resultant vector",
    netSum: "spot + perps",
    priceAgo: "ago",
    priceNow: "now",
    barMove: "bar move",
    agreeHit: "Vector matched price",
    agreeMiss: "Vector and price diverged",
    agreeWeak: "Net is weak — bar has no clear print",
  },
} as const;

export function regimeLabel(lang: Lang, id: RegimeId): string {
  return REGIME[lang][id];
}

export function couplingLabel(lang: Lang, id: CouplingId): string {
  return COUPLING[lang][id];
}

export function pullDirLabel(lang: Lang, dir: PullDir): string {
  return DIR[lang][dir];
}

export function agreeLabel(lang: Lang, id: NetAgree): string {
  const t = ui[lang];
  if (id === "hit") return t.agreeHit;
  if (id === "miss") return t.agreeMiss;
  return t.agreeWeak;
}

export function flowHint(flow: number, lang: Lang): string {
  const t = ui[lang];
  if (Math.abs(flow) < 0.04) return t.takerMixed;
  return flow > 0 ? t.takerBuy : t.takerSell;
}

function formatDuration(ms: number, lang: Lang): string {
  const m = Math.round(ms / 60000);
  if (m < 60) return lang === "ru" ? `${m} мин` : `${m}m`;
  const h = m / 60;
  if (h < 24) {
    const v = Number.isInteger(h) ? h.toFixed(0) : h.toFixed(1);
    return lang === "ru" ? `${v} ч` : `${v}h`;
  }
  const d = h / 24;
  const v = Number.isInteger(d) ? d.toFixed(0) : d.toFixed(1);
  return lang === "ru" ? `${v} д` : `${v}d`;
}

export function couplingShort(lang: Lang, id: CouplingId): string {
  return COUPLING_SHORT[lang][id];
}

export function windowChipLabel(window: number, lang: Lang): string {
  return lang === "ru" ? `${window} бар` : `${window} bars`;
}

export function tfShort(interval: Interval, window: number, lang: Lang): string {
  const dur = formatDuration(intervalMs(interval) * window, lang);
  return `${interval} · ${dur}`;
}

export function tfPhrase(interval: Interval, window: number, lang: Lang): string {
  const dur = formatDuration(intervalMs(interval) * window, lang);
  return lang === "ru"
    ? `таймфрейме ${interval} за последние ${dur}`
    : `${interval} over the last ${dur}`;
}

export function windowLabel(interval: Interval, window: number, lang: Lang): string {
  return formatDuration(intervalMs(interval) * window, lang);
}

export function couplingBlurb(data: GravitySnapshot, lang: Lang): string {
  const tf = tfPhrase(data.interval, data.window, lang);
  const sDir = pullDirLabel(lang, data.spotPull.dir);
  const pDir = pullDirLabel(lang, data.perpPull.dir);
  const sPx = formatPct(data.spotPull.retPct);
  const pPx = formatPct(data.perpPull.retPct);
  const stronger =
    Math.abs(data.spotPull.score) >= Math.abs(data.perpPull.score)
      ? lang === "ru"
        ? "спот"
        : "spot"
      : lang === "ru"
        ? "перпы"
        : "perps";

  if (lang === "ru") {
    switch (data.coupling) {
      case "sync_up":
        return `На ${tf} спот и перпы работают синхронно вверх. Спот ${sPx}, перпы ${pPx} — оба тянут цену выше.`;
      case "sync_down":
        return `На ${tf} спот и перпы работают синхронно вниз. Спот ${sPx}, перпы ${pPx} — оба давят цену.`;
      case "fight":
        return `На ${tf} рынки борются: спот тянет ${sDir} (${sPx}), перпы — ${pDir} (${pPx}). Цена идёт за более сильным вектором (${stronger}).`;
      case "spot_alone":
        return `На ${tf} направление задаёт спот (${sDir}, ${sPx}). Перпы почти нейтральны (${pPx}).`;
      case "perp_alone":
        return `На ${tf} направление задают перпы (${pDir}, ${pPx}). Спот почти нейтрален (${sPx}).`;
      case "quiet":
        return `На ${tf} нет явного вектора: ни спот, ни перпы не тянут цену заметно вверх или вниз.`;
    }
  }

  switch (data.coupling) {
    case "sync_up":
      return `On ${tf}, spot and perps are working in sync to the upside. Spot ${sPx}, perps ${pPx} — both pulling price higher.`;
    case "sync_down":
      return `On ${tf}, spot and perps are working in sync to the downside. Spot ${sPx}, perps ${pPx} — both pressing price lower.`;
    case "fight":
      return `On ${tf} the markets are fighting: spot pulls ${sDir} (${sPx}), perps ${pDir} (${pPx}). Price follows the stronger vector (${stronger}).`;
    case "spot_alone":
      return `On ${tf} spot sets the direction (${sDir}, ${sPx}). Perps are nearly neutral (${pPx}).`;
    case "perp_alone":
      return `On ${tf} perps set the direction (${pDir}, ${pPx}). Spot is nearly neutral (${sPx}).`;
    case "quiet":
      return `On ${tf} there is no clear vector: neither spot nor perps are pulling price meaningfully up or down.`;
  }
}

export function volumeBlurb(data: GravitySnapshot, lang: Lang): string {
  const tf = tfPhrase(data.interval, data.window, lang);
  const s = formatUsdCompact(data.spotVol.total);
  const p = formatUsdCompact(data.perpVol.total);
  const sd = formatPct(data.spotVol.deltaPct, 0);
  const pd = formatPct(data.perpVol.deltaPct, 0);
  const split = `${data.spotVol.eqShare.toFixed(0)}/${data.perpVol.eqShare.toFixed(0)}`;
  const raw = `${data.spotVol.share.toFixed(0)}/${data.perpVol.share.toFixed(0)}`;
  if (lang === "ru") {
    return `Активность на ${tf} (к своему среднему) ${split}. Номинал USDT ${raw} — перпы почти всегда больше, это не влияние. Спот ${s} (последний бар ${sd} к среднему), перпы ${p} (${pd}).`;
  }
  return `Activity on ${tf} (vs own average) ${split}. USDT notional ${raw} — perps almost always print more; that is not influence. Spot ${s} (last bar ${sd} vs average), perps ${p} (${pd}).`;
}

export function verdict(data: GravitySnapshot, lang: Lang): string {
  const t = ui[lang];
  const tf = tfPhrase(data.interval, data.window, lang);
  const split = `${data.spotShare.toFixed(0)}/${data.perpShare.toFixed(0)}`;
  const basisState =
    Math.abs(data.basisBps) < 2
      ? lang === "ru"
        ? "почти плоский"
        : "nearly flat"
      : data.basisBps > 0
        ? lang === "ru"
          ? "в премии"
          : "at a premium"
        : lang === "ru"
          ? "в дисконте"
          : "at a discount";
  const lagBit =
    data.lag.leader === "tied"
      ? t.lagTied
      : data.lag.leader === "perp"
        ? lang === "ru"
          ? `по тикам перпы опережают спот на ~${data.lag.bars} ${t.bars}`
          : `ticks: perps lead spot by ~${data.lag.bars} ${t.bars}`
        : lang === "ru"
          ? `по тикам спот опережает перпы на ~${data.lag.bars} ${t.bars}`
          : `ticks: spot leads perps by ~${data.lag.bars} ${t.bars}`;
  const regime = regimeLabel(lang, data.regime);
  const dir =
    data.priceChangePct > 0.08
      ? lang === "ru"
        ? "ход вверх"
        : "move up"
      : data.priceChangePct < -0.08
        ? lang === "ru"
          ? "ход вниз"
          : "move down"
        : lang === "ru"
          ? "без явного хода"
          : "no clear drift";
  const couple = couplingBlurb(data, lang);
  const vol = volumeBlurb(data, lang);

  if (lang === "ru") {
    if (Math.abs(data.g) < 0.28) {
      return `На ${tf} явного лидера нет (спот/перпы ${split}). ${dir[0].toUpperCase()}${dir.slice(1)}, ${lagBit}. Базис ${data.basisBps.toFixed(1)} bps, ${basisState}. Режим: ${regime.toLowerCase()}. ${couple} ${vol}`;
    }
    const driver = data.g > 0 ? "бессрочные фьючерсы" : "спот";
    const share = data.g > 0 ? data.perpShare : data.spotShare;
    return `На ${tf} ${dir}: цену тянут ${driver} (${share.toFixed(0)}% влияния). ${lagBit}. Базис ${data.basisBps.toFixed(1)} bps, ${basisState}. Режим: ${regime.toLowerCase()}. ${couple} ${vol}`;
  }

  if (Math.abs(data.g) < 0.1) {
    return `On ${tf} there is no clear leader (spot/perps ${split}). ${dir}, ${lagBit}. Basis ${data.basisBps.toFixed(1)} bps, ${basisState}. Regime: ${regime.toLowerCase()}. ${couple} ${vol}`;
  }
  const driver = data.g > 0 ? "perpetual futures" : "spot";
  const share = data.g > 0 ? data.perpShare : data.spotShare;
  return `On ${tf}, ${dir}: ${driver} are pulling (${share.toFixed(0)}% influence). ${lagBit}. Basis ${data.basisBps.toFixed(1)} bps, ${basisState}. Regime: ${regime.toLowerCase()}. ${couple} ${vol}`;
}

export const METHOD = {
  ru: {
    title: "GDI — Gravity Discovery Index",
    lead: "Индекс показывает, какая площадка сейчас определяет цену: спот (реальный спрос) или бессрочные фьючерсы (леверидж). Это не RSI и не funding — это доля price discovery.",
    w1: "Lead-lag (27%)",
    w1d: "Корреляция доходности перпов с будущим спотом минус обратная. Плюс «пульс»: кто сделал больший ход на последних барах.",
    w2: "Базис (26%)",
    w2d: "Только изменение базиса в сторону хода. Постоянная премия перпов (обычный контанго) в G не входит — иначе любой рост с премией выглядел бы как лидерство фьючерсов.",
    w3: "Агрессия (22%)",
    w3d: "Taker buy/sell как доля, не как USDT. Дисбаланс площадки взвешен её импульсом объёма: наклон на мёртвом стакане слабее, чем тот же наклон на всплеске.",
    w4: "OI-импульс (13%)",
    w4d: "Δ OI × знак (импульс перпов − импульс спота). OI есть только на фьючерсах, но если спот горячее своего среднего, этот блок тянет G к споту, а не выдаёт перпам бесплатный плюс.",
    w5: "Объём (12%)",
    w5d: "Выровненная активность: recent/avg каждой площадки. 50/50 когда оба торгуют как обычно. Плюс лог-отклонение отношения perp/spot от медианы окна. Сырой номинал 7/93 в индекс не входит.",
    dir: "Векторы направления",
    dird: "Общий ход mid не считается уникальной тягой. Остаток (свой ход − mid) учитывается только если базис реально дышит — иначе склеенный тик не рисует ложную борьбу. Дальше taker и импульс.",
    vol: "Объём",
    vold: "Номинал USDT — факт оборота, почти всегда 5–10% спот. Полоса «активность» — кто горячее своего обычного. В G и векторы идёт только она.",
    net: "Результирующий вектор",
    netd: "Сумма векторов спота и перпов. Синхронно вверх — один большой зелёный. Синхронно вниз — красный. Борьба — взаимовычет, нетто короткий. Рядом цена 1 бар назад на выбранном ТФ: совпал ли знак нетто с ходом бара.",
    read: "G ∈ [−1, +1]. Отрицательный — спот. Положительный — перпы. Доля влияния = 50 ± 50·G — это не доля оборота. Вектор площадки ∈ [−1, +1]: минус вниз, плюс вверх. Объём масштабирует силу, не знак.",
    kata: "Для kScript / Kata: residual = r_venue − r_mid, deadzone 0.18σ. Taker imb × volImpulse. eqShare = rel_s / (rel_s+rel_p). OI = |ΔOI| × tanh(perpImp−spotImp). Базис: z(Δbasis) + sign(Δpx)·Δbasis, не уровень премии. Веса 0.27 / 0.26 / 0.22 / 0.13 / 0.12.",
  },
  en: {
    title: "GDI — Gravity Discovery Index",
    lead: "The index answers which venue is discovering price right now: spot (cash demand) or perpetual futures (leverage). Not RSI, not funding — a price-discovery share.",
    w1: "Lead-lag (27%)",
    w1d: "Correlation of perp returns with future spot minus the reverse, plus a pulse of who printed the larger move on the last bars.",
    w2: "Basis (26%)",
    w2d: "Only basis change in the direction of the move. A static perp premium (normal crypto contango) does not enter G — otherwise any rally with a premium would look futures-led.",
    w3: "Aggression (22%)",
    w3d: "Taker buy/sell as a ratio, not USDT. Each venue's imbalance is weighted by its own volume impulse: a tilt on a dead book is weaker than the same tilt on a spike.",
    w4: "OI impulse (13%)",
    w4d: "ΔOI × sign(perp impulse − spot impulse). OI exists only on futures, but if spot is hotter than its own average this block pulls G toward spot instead of handing perps a free plus.",
    w5: "Volume (12%)",
    w5d: "Equalized activity: recent/avg per venue. 50/50 when both print their normal. Plus log-deviation of perp/spot ratio from the window median. Raw 7/93 notional never enters G.",
    dir: "Direction vectors",
    dird: "The shared mid print is not a unique pull. Residual (own return − mid) counts only if basis actually breathes — glued ticks do not fake a fight. Then taker and impulse.",
    vol: "Volume",
    vold: "USDT notional is turnover, almost always 5–10% spot. The activity bar is who is hotter than their own normal. Only that feeds G and the vectors.",
    net: "Resultant vector",
    netd: "Sum of the spot and perp vectors. Sync up — one large green. Sync down — red. Fight — they cancel, net is short. Beside it: price 1 bar ago on the selected TF, so you can see whether net sign matches the bar.",
    read: "G ∈ [−1, +1]. Negative = spot. Positive = perps. Influence share = 50 ± 50·G — not turnover share. Venue vector ∈ [−1, +1]: minus down, plus up. Volume scales magnitude, not sign.",
    kata: "For kScript / Kata: residual = r_venue − r_mid, deadzone 0.18σ. Taker imb × volImpulse. eqShare = rel_s / (rel_s+rel_p). OI = |ΔOI| × tanh(perpImp−spotImp). Basis: z(Δbasis) + sign(Δpx)·Δbasis, not premium level. Weights 0.27 / 0.26 / 0.22 / 0.13 / 0.12.",
  },
} as const;
