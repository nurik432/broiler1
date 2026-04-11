// Нормы по содержанию цыплят бройлеров кросс ROSS-308
// weight     — живая масса (г/гол)     [бывшее поле cumFeed]
// waterNorm  — потребление воды (мл/гол/сутки) [бывшее поле weight]
// dailyFeed  — потребление корма (г/гол/сутки)
export const ROSS308_STANDARDS = [
  { day:1,  week:1, dailyFeed:13,  weight:56,   waterNorm:23,  tempMin:32, tempMax:33, humidMin:50, humidMax:59 },
  { day:2,  week:1, dailyFeed:17,  weight:72,   waterNorm:31,  tempMin:32, tempMax:33, humidMin:50, humidMax:59 },
  { day:3,  week:1, dailyFeed:21,  weight:89,   waterNorm:38,  tempMin:32, tempMax:33, humidMin:50, humidMax:59 },
  { day:4,  week:1, dailyFeed:23,  weight:109,  waterNorm:41,  tempMin:32, tempMax:33, humidMin:50, humidMax:59 },
  { day:5,  week:1, dailyFeed:27,  weight:131,  waterNorm:47,  tempMin:29, tempMax:30, humidMin:40, humidMax:60 },
  { day:6,  week:1, dailyFeed:31,  weight:157,  waterNorm:56,  tempMin:29, tempMax:30, humidMin:40, humidMax:60 },
  { day:7,  week:1, dailyFeed:35,  weight:185,  waterNorm:63,  tempMin:29, tempMax:30, humidMin:40, humidMax:60 },
  { day:8,  week:2, dailyFeed:39,  weight:215,  waterNorm:70,  tempMin:27, tempMax:28, humidMin:40, humidMax:60 },
  { day:9,  week:2, dailyFeed:44,  weight:247,  waterNorm:79,  tempMin:27, tempMax:28, humidMin:40, humidMax:60 },
  { day:10, week:2, dailyFeed:48,  weight:283,  waterNorm:88,  tempMin:27, tempMax:28, humidMin:40, humidMax:60 },
  { day:11, week:2, dailyFeed:54,  weight:321,  waterNorm:97,  tempMin:27, tempMax:28, humidMin:40, humidMax:60 },
  { day:12, week:2, dailyFeed:58,  weight:364,  waterNorm:104, tempMin:27, tempMax:28, humidMin:40, humidMax:60 },
  { day:13, week:2, dailyFeed:64,  weight:412,  waterNorm:115, tempMin:27, tempMax:28, humidMin:40, humidMax:60 },
  { day:14, week:2, dailyFeed:68,  weight:465,  waterNorm:122, tempMin:27, tempMax:28, humidMin:50, humidMax:60 },
  { day:15, week:3, dailyFeed:75,  weight:524,  waterNorm:135, tempMin:24, tempMax:26, humidMin:50, humidMax:60 },
  { day:16, week:3, dailyFeed:81,  weight:586,  waterNorm:146, tempMin:24, tempMax:26, humidMin:50, humidMax:60 },
  { day:17, week:3, dailyFeed:87,  weight:651,  waterNorm:157, tempMin:24, tempMax:26, humidMin:50, humidMax:60 },
  { day:18, week:3, dailyFeed:93,  weight:719,  waterNorm:167, tempMin:24, tempMax:26, humidMin:50, humidMax:60 },
  { day:19, week:3, dailyFeed:98,  weight:790,  waterNorm:178, tempMin:24, tempMax:26, humidMin:50, humidMax:60 },
  { day:20, week:3, dailyFeed:105, weight:869,  waterNorm:189, tempMin:24, tempMax:26, humidMin:50, humidMax:60 },
  { day:21, week:3, dailyFeed:111, weight:943,  waterNorm:200, tempMin:24, tempMax:26, humidMin:50, humidMax:60 },
  { day:22, week:4, dailyFeed:111, weight:1023, waterNorm:211, tempMin:21, tempMax:23, humidMin:45, humidMax:50 },
  { day:23, week:4, dailyFeed:123, weight:1104, waterNorm:221, tempMin:21, tempMax:23, humidMin:45, humidMax:50 },
  { day:24, week:4, dailyFeed:130, weight:1186, waterNorm:232, tempMin:21, tempMax:23, humidMin:45, humidMax:50 },
  { day:25, week:4, dailyFeed:134, weight:1269, waterNorm:241, tempMin:21, tempMax:23, humidMin:45, humidMax:50 },
  { day:26, week:4, dailyFeed:141, weight:1353, waterNorm:254, tempMin:21, tempMax:23, humidMin:45, humidMax:50 },
  { day:27, week:4, dailyFeed:148, weight:1438, waterNorm:266, tempMin:21, tempMax:23, humidMin:45, humidMax:50 },
  { day:28, week:4, dailyFeed:152, weight:1524, waterNorm:274, tempMin:21, tempMax:23, humidMin:45, humidMax:50 },
  { day:29, week:5, dailyFeed:158, weight:1613, waterNorm:284, tempMin:20, tempMax:21, humidMin:45, humidMax:65 },
  { day:30, week:5, dailyFeed:163, weight:1705, waterNorm:293, tempMin:20, tempMax:21, humidMin:45, humidMax:65 },
  { day:31, week:5, dailyFeed:169, weight:1799, waterNorm:304, tempMin:20, tempMax:21, humidMin:45, humidMax:65 },
  { day:32, week:5, dailyFeed:174, weight:1895, waterNorm:313, tempMin:20, tempMax:21, humidMin:45, humidMax:65 },
  { day:33, week:5, dailyFeed:180, weight:1993, waterNorm:328, tempMin:20, tempMax:21, humidMin:45, humidMax:65 },
  { day:34, week:5, dailyFeed:182, weight:2092, waterNorm:338, tempMin:20, tempMax:21, humidMin:45, humidMax:65 },
  { day:35, week:5, dailyFeed:189, weight:2191, waterNorm:347, tempMin:20, tempMax:21, humidMin:45, humidMax:65 },
  { day:36, week:6, dailyFeed:193, weight:2289, waterNorm:355, tempMin:20, tempMax:21, humidMin:45, humidMax:65 },
  { day:37, week:6, dailyFeed:197, weight:2386, waterNorm:362, tempMin:20, tempMax:21, humidMin:45, humidMax:65 },
  { day:38, week:6, dailyFeed:201, weight:2482, waterNorm:369, tempMin:20, tempMax:21, humidMin:45, humidMax:65 },
  { day:39, week:6, dailyFeed:205, weight:2577, waterNorm:376, tempMin:20, tempMax:21, humidMin:45, humidMax:65 },
  { day:40, week:6, dailyFeed:209, weight:2671, waterNorm:383, tempMin:20, tempMax:21, humidMin:45, humidMax:65 },
  { day:41, week:6, dailyFeed:213, weight:2764, waterNorm:389, tempMin:20, tempMax:21, humidMin:45, humidMax:65 },
  { day:42, week:6, dailyFeed:216, weight:2857, waterNorm:395, tempMin:20, tempMax:21, humidMin:45, humidMax:65 },
  { day:43, week:7, dailyFeed:220, weight:2950, waterNorm:402, tempMin:20, tempMax:20, humidMin:35, humidMax:55 },
  { day:44, week:7, dailyFeed:225, weight:3044, waterNorm:407, tempMin:20, tempMax:20, humidMin:35, humidMax:55 },
  { day:45, week:7, dailyFeed:221, weight:3139, waterNorm:412, tempMin:20, tempMax:20, humidMin:35, humidMax:55 },
];

// Допустимый накопительный % падежа по неделям (ROSS-308)
export const MORTALITY_NORMS_BY_WEEK = {
  1: 0.5,
  2: 0.8,
  3: 1.1,
  4: 1.4,
  5: 1.8,
  6: 2.2,
  7: 2.5,
};

// Допустимые отклонения от нормы (%)
export const DEVIATION_THRESHOLDS = {
  ok: 5,       // ±5%  — зелёный
  warning: 15, // ±15% — жёлтый, свыше — красный
};

// 1 мешок корма = 40 кг = 40 000 г
export const FEED_BAG_WEIGHT_G = 40000;

export function getNormForDay(day) {
  return ROSS308_STANDARDS.find(s => s.day === day) || null;
}

export function getWeekMortalityNorm(week) {
  return MORTALITY_NORMS_BY_WEEK[Math.min(week, 7)] || 2.5;
}
