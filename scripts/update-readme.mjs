import { readFile, writeFile, mkdir } from "node:fs/promises";

const username = process.env.GITHUB_REPOSITORY_OWNER || "iamabhishekpanda";
const profileRepo = process.env.GITHUB_REPOSITORY?.split("/")[1] || username;
const headers = {
  Accept: "application/vnd.github+json",
  "User-Agent": `${username}-profile-portfolio`,
  ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
};

const get = async (path) => {
  const response = await fetch(`https://api.github.com${path}`, { headers });
  if (!response.ok) throw new Error(`GitHub API ${response.status} for ${path}`);
  return response.json();
};

const getAllRepos = async () => {
  const results = [];
  for (let page = 1; ; page += 1) {
    const batch = await get(`/users/${username}/repos?per_page=100&sort=pushed&page=${page}`);
    results.push(...batch);
    if (batch.length < 100) return results;
  }
};

const [profile, allRepos, events] = await Promise.all([
  get(`/users/${username}`),
  getAllRepos(),
  get(`/users/${username}/events/public?per_page=100`).catch(() => []),
]);

const repos = allRepos
  .filter((repo) => !repo.fork && !repo.archived && repo.name !== profileRepo)
  .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at));
const featured = repos.slice(0, 5);
const languageRepos = repos.slice(0, 20);
const languageResults = await Promise.all(languageRepos.map((repo) => get(`/repos/${username}/${repo.name}/languages`).catch(() => ({}))));
const repositoryTrees = await Promise.all(repos.slice(0, 12).map(async (repo) => {
  const tree = await get(`/repos/${username}/${repo.name}/git/trees/${encodeURIComponent(repo.default_branch)}?recursive=1`).catch(() => ({ tree: [] }));
  return [repo.name, (tree.tree || []).filter((item) => item.type === "blob").map((item) => item.path).join(" ").toLowerCase()];
}));
const treeEvidence = new Map(repositoryTrees);
const languages = {};
languageResults.forEach((result) => Object.entries(result).forEach(([name, bytes]) => { languages[name] = (languages[name] || 0) + bytes; }));
const languageTotal = Object.values(languages).reduce((sum, bytes) => sum + bytes, 0);
const topLanguages = Object.entries(languages).sort((a, b) => b[1] - a[1]).slice(0, 6);

const totalStars = repos.reduce((sum, repo) => sum + repo.stargazers_count, 0);
const totalForks = repos.reduce((sum, repo) => sum + repo.forks_count, 0);
const recentCutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
const activeRepos = repos.filter((repo) => new Date(repo.pushed_at).getTime() >= recentCutoff).length;
const eventCounts = Array.from({ length: 12 }, () => 0);
events.forEach((event) => {
  const age = Math.floor((Date.now() - new Date(event.created_at).getTime()) / (7 * 24 * 60 * 60 * 1000));
  if (age >= 0 && age < 12) eventCounts[11 - age] += 1;
});
let activityStreak = 0;
for (let index = eventCounts.length - 1; index >= 0 && eventCounts[index] > 0; index -= 1) activityStreak += 1;

const xml = (value = "") => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const truncate = (value, length) => value?.length > length ? `${value.slice(0, length - 1)}…` : (value || "");
const date = (value) => new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)).toUpperCase();
const colors = ["#3157FF", "#18A999", "#FFCA3A", "#FF6B35", "#8B5CF6", "#93A1B5"];
const portrait = (await readFile("assets/abhishek-panda.jpg")).toString("base64");

const career = [
  ["MAR 2026 - PRESENT", "QUALITY AI", "HISCOX - LONDON MARKET INSURANCE", "ARCHITECT - AI SOLUTION ARCHITECT", "London Market underwriting AI: governed multi-agent systems, MCP integrations, RAG, document intelligence, evaluation and observability.", "qualityai", ["hiscoxgroup.com"]],
  ["JAN 2023 - AUG 2025", "SOLERA", "SMARTDRIVE - ENTERPRISE FLEET INTELLIGENCE", "SENIOR SOFTWARE ENGINEER - AI/ML R&D", "Fleet intelligence at 10K+ driver scale: PyTorch models, Bedrock route intelligence, 100K+ document RAG, LangGraph agents and SageMaker MLOps.", "solera.com", ["smartdrive.net"]],
  ["JUN 2022 - DEC 2022", "ACCION LABS", "KPMG CONTRACT / DELL", "PRINCIPAL SOFTWARE ENGINEER", "Enterprise conversational AI for 25K+ monthly queries: BERT intent models, Sentence Transformers retrieval, Azure AI Search and AKS inference.", "accionlabs.com", ["kpmg.com", "dell.com"]],
  ["MAY 2020 - JUL 2022", "WELLS FARGO", "WEALTH & INVESTMENT MANAGEMENT TECHNOLOGY", "ASSISTANT VICE PRESIDENT", "Modernized and governed 14+ brokerage platforms with .NET, Azure, event-driven services, DevSecOps controls and regulated-cloud architecture.", "wellsfargo.com", []],
  ["AUG 2018 - JUN 2020", "VIRTUSA", "AVIATION OPERATIONS - DOHA", "ASSOCIATE CONSULTANT", "Aviation modernization: Azure microservices, APIM security, Functions, Service Bus and Angular operations platforms.", "virtusa.com", []],
  ["APR 2018 - JUN 2018", "JD SPORTS & FASHION", "ENTERPRISE RETAIL PLATFORMS", "SOFTWARE ENGINEER", "Retail order, inventory and customer-service systems using .NET Core, Angular, SQL Server, RabbitMQ and automated delivery.", "jdsports.com", []],
  ["JUL 2015 - JUL 2017", "CONDUENT", "BANK OF AMERICA / METLIFE", "SOFTWARE ENGINEER", "Secure banking and insurance platforms spanning credit compliance, policy administration, claims, billing, auditability and performance engineering.", "conduent.com", ["bankofamerica.com", "metlife.com"]],
];

const techCatalog = [
  ["Python", "python", null, "3776AB"], ["C# / .NET", "dotnet", "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/dot-net/dot-net-original.svg", "512BD4"], ["FastAPI", "fastapi", null, "009688"], ["Angular", "angular", null, "DD0031"], ["Blazor", "blazor", "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/blazor/blazor-original.svg", "512BD4"],
  ["PyTorch", "pytorch", null, "EE4C2C"], ["scikit-learn", "scikitlearn", null, "F7931E"], ["Hugging Face", "huggingface", null, "FFD21E"], ["LangChain", "langchain", null, "1C3C3C"], ["MLflow", "mlflow", null, "0194E2"],
  ["Azure", "microsoftazure", "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/azure/azure-original.svg", "0078D4"], ["Azure DevOps", "azuredevops", "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/azuredevops/azuredevops-original.svg", "0078D7"], ["AWS", "amazonwebservices", "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/amazonwebservices/amazonwebservices-plain-wordmark.svg", "FF9900"], ["OpenAI", "openai", null, "10A37F"], ["Claude", "anthropic", null, "D97757"],
  ["Docker", "docker", null, "2496ED"], ["Kubernetes", "kubernetes", null, "326CE5"], ["Argo CD", "argo", null, "EF7B4D"], ["GitHub Actions", "githubactions", null, "2088FF"], ["GitHub", "github", null, "181717"],
  ["PostgreSQL", "postgresql", null, "4169E1"], ["SQL Server", "microsoftsqlserver", "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/microsoftsqlserver/microsoftsqlserver-original.svg", "CC2927"], ["DynamoDB", "amazondynamodb", "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/dynamodb/dynamodb-original.svg", "4053D6"], ["RabbitMQ", "rabbitmq", null, "FF6600"], ["OAuth 2.0", "auth0", null, "EB5424"],
  ["Grafana", "grafana", null, "F46800"], ["REST APIs", "swagger", null, "85EA2D"], ["Linux", "linux", null, "FCC624"], ["TypeScript", "typescript", null, "3178C6"], ["Terraform", "terraform", null, "844FBA"],
];

const iconData = new Map(await Promise.all(techCatalog.map(async ([name, slug, fallbackUrl, color]) => {
  try {
    let response = await fetch(`https://cdn.simpleicons.org/${slug}/${color}`);
    if (!response.ok && fallbackUrl) response = await fetch(fallbackUrl);
    if (!response.ok) return [name, null];
    return [name, Buffer.from(await response.text()).toString("base64")];
  } catch { return [name, null]; }
})));

const logoDomains = [...new Set(career.flatMap(([, , , , , employerDomain, clientDomains]) => [employerDomain, ...clientDomains]).filter((domain) => domain.includes(".")))];
const brandLogoFiles = new Map([
  ["qualityai", "assets/quality-ai-mark.svg"],
]);
const brandLogos = new Map(await Promise.all([...brandLogoFiles].map(async ([brand, path]) => [
  brand,
  `data:image/svg+xml;base64,${(await readFile(path)).toString("base64")}`,
])));
const companyLogos = new Map(await Promise.all(logoDomains.map(async (domain) => {
  try {
    const response = await fetch(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`);
    if (!response.ok) return [domain, null];
    return [domain, Buffer.from(await response.arrayBuffer()).toString("base64")];
  } catch { return [domain, null]; }
})));

const evidence = new Map();
const aliases = {
  "Python": ["python"], "C# / .NET": ["c#", "csharp", ".net", "dotnet"], "FastAPI": ["fastapi"], "Angular": ["angular"], "Blazor": ["blazor"],
  "PyTorch": ["pytorch"], "scikit-learn": ["scikit-learn", "sklearn"], "Hugging Face": ["huggingface", "transformers"], "LangChain": ["langchain", "langgraph"], "MLflow": ["mlflow"],
  "Azure": ["azure"], "Azure DevOps": ["azure-devops", "azuredevops"], "AWS": ["aws", "amazon-web-services"], "OpenAI": ["openai", "gpt"], "Claude": ["claude", "anthropic"],
  "Docker": ["docker"], "Kubernetes": ["kubernetes", "k8s"], "Argo CD": ["argocd", "argo-cd"], "GitHub Actions": ["github-actions"], "GitHub": ["github"],
  "PostgreSQL": ["postgresql", "postgres"], "SQL Server": ["sql-server", "mssql"], "DynamoDB": ["dynamodb"], "RabbitMQ": ["rabbitmq"], "OAuth 2.0": ["oauth", "oauth2"],
  "Grafana": ["grafana"], "REST APIs": ["rest-api", "openapi", "swagger"], "Linux": ["linux", "shell"], "TypeScript": ["typescript"], "Terraform": ["terraform", "hcl"],
};
repos.forEach((repo) => {
  const tree = treeEvidence.get(repo.name) || "";
  const fileSignals = [
    tree.includes("dockerfile") && "docker",
    tree.includes(".github/workflows/") && "github-actions",
    /(^| )[^ ]+\.tf( |$)/.test(tree) && "terraform hcl",
    (tree.includes("kubernetes") || tree.includes("k8s") || tree.includes("helm")) && "kubernetes",
    tree.includes("angular.json") && "angular",
    tree.includes(".csproj") && "csharp dotnet",
    tree.includes(".razor") && "blazor",
    (tree.includes("requirements.txt") || tree.includes("pyproject.toml")) && "python",
  ].filter(Boolean).join(" ");
  const haystack = [repo.language, repo.name, repo.description, ...(repo.topics || []), tree, fileSignals].filter(Boolean).join(" ").toLowerCase();
  Object.entries(aliases).forEach(([tech, terms]) => {
    if (terms.some((term) => haystack.includes(term))) evidence.set(tech, (evidence.get(tech) || 0) + 1);
  });
});

const languageBar = (() => {
  if (!languageTotal) return `<rect x="42" y="908" width="1116" height="14" fill="#E3E5E8"/><text x="42" y="950" class="small muted">LANGUAGE DATA APPEARS AS PUBLIC CODE IS ADDED</text>`;
  let x = 42;
  const bars = topLanguages.map(([name, bytes], index) => {
    const width = 1116 * bytes / languageTotal;
    const segment = `<rect x="${x.toFixed(1)}" y="908" width="${Math.max(width, 2).toFixed(1)}" height="14" fill="${colors[index]}"/>`;
    x += width;
    return segment;
  }).join("");
  const labels = topLanguages.map(([name, bytes], index) => {
    const xPos = 42 + (index % 3) * 370;
    const yPos = 951 + Math.floor(index / 3) * 30;
    return `<circle cx="${xPos + 5}" cy="${yPos - 5}" r="5" fill="${colors[index]}"/><text x="${xPos + 18}" y="${yPos}" class="small ink">${xml(name)} ${(bytes / languageTotal * 100).toFixed(1)}%</text>`;
  }).join("");
  return bars + labels;
})();

const activityBars = eventCounts.map((count, index) => {
  const height = Math.min(84, Math.max(4, count * 10));
  return `<rect x="${790 + index * 29}" y="${744 - height}" width="17" height="${height}" fill="#3157FF" opacity="${0.35 + index * 0.045}"><animate attributeName="opacity" values=".22;1;.22" dur="${3 + index * .12}s" begin="${index * .08}s" repeatCount="indefinite"/></rect>`;
}).join("");

const repoRowCount = Math.max(1, featured.length);
const repoStart = 1092;
const careerTitleY = repoStart + repoRowCount * 126 + 18;
const careerStart = careerTitleY + 42;
const techTitleY = careerStart + career.length * 126 + 70;
const techGridStart = techTitleY + 47;
const skillsStart = techGridStart + 6 * 70 + 20;
const heatTitleY = skillsStart + 6 * 48 + 20;
const heatStart = heatTitleY + 52;
const educationY = heatStart + 3 * 78 + 80;
const height = educationY + 110;

const repoCards = (featured.length ? featured : [{ name: "NO PUBLIC BUILDS YET", description: "This panel will expand automatically when the first public repository is pushed.", language: "READY TO DISCOVER", stargazers_count: 0, forks_count: 0, pushed_at: null }])
  .map((repo, index) => {
    const y = repoStart + index * 126;
    return `
      <g transform="translate(42 ${y})">
        <rect x="-10" y="-8" width="1136" height="108" rx="18" fill="url(#clayCard)" filter="url(#clay)"/>
        <text y="24" class="repo ink">${String(index + 1).padStart(2, "0")}  ${xml(truncate(repo.name, 35))}</text>
        <text y="53" class="body muted">${xml(truncate(repo.description, 92))}</text>
        <text y="85" class="small blue">${xml(repo.language || "MULTI-LANGUAGE")}</text>
        <text x="220" y="85" class="small ink">★ ${repo.stargazers_count}   FORKS ${repo.forks_count}</text>
        <text x="1116" y="85" text-anchor="end" class="small muted">${repo.pushed_at ? `UPDATED ${date(repo.pushed_at)}` : "AWAITING FIRST PUBLIC REPOSITORY"}</text>
      </g>`;
  }).join("");

const logoMarkup = (domain, x, y, fallback) => {
  const brandLogo = brandLogos.get(domain);
  if (brandLogo) return `<image href="${brandLogo}" x="${x}" y="${y}" width="34" height="34" preserveAspectRatio="xMidYMid meet"/>`;
  const logo = companyLogos.get(domain);
  return logo
    ? `<rect x="${x}" y="${y}" width="34" height="34" rx="9" fill="#fff"/><image href="data:image/png;base64,${logo}" x="${x + 5}" y="${y + 5}" width="24" height="24" preserveAspectRatio="xMidYMid meet"/>`
    : `<rect x="${x}" y="${y}" width="34" height="34" rx="9" fill="#3157FF"/><text x="${x + 17}" y="${y + 22}" text-anchor="middle" fill="#fff" class="micro">${xml(fallback.slice(0, 2).toUpperCase())}</text>`;
};

const careerTimeline = career.map(([period, company, client, role, summary, employerDomain, clientDomains], index) => {
  const y = careerStart + index * 126;
  const split = summary.length > 94 ? summary.lastIndexOf(" ", 94) : -1;
  const firstLine = split > 0 ? summary.slice(0, split) : summary;
  const secondLine = split > 0 ? summary.slice(split + 1) : "";
  const clientIcons = clientDomains.map((domain, logoIndex) => logoMarkup(domain, 920 + logoIndex * 40, -10, client)).join("");
  return `<g transform="translate(42 ${y})">
    <circle cx="8" cy="15" r="7" fill="#F7F6EF" stroke="#3157FF" stroke-width="3"><animate attributeName="r" values="6;9;6" dur="3s" begin="${index * .2}s" repeatCount="indefinite"/></circle><path d="M8 22V126" stroke="#3157FF" stroke-opacity=".28"/>
    <text x="34" y="19" class="small blue">${xml(period)}</text>${logoMarkup(employerDomain, 190, -10, company)}<text x="234" y="19" class="repo ink">${xml(company)}</text>
    ${clientIcons}<text x="1116" y="45" text-anchor="end" class="micro blue">CLIENT · ${xml(client)}</text>
    <text x="234" y="45" class="small muted">${xml(role)}</text><text x="190" y="75" class="body ink">${xml(firstLine)}</text>${secondLine ? `<text x="190" y="98" class="body ink">${xml(secondLine)}</text>` : ""}
  </g>`;
}).join("");

const techGrid = techCatalog.map(([name], index) => {
  const col = index % 5;
  const row = Math.floor(index / 5);
  const x = 42 + col * 224;
  const y = techGridStart + row * 70;
  const icon = iconData.get(name);
  const iconMarkup = icon
    ? `<image href="data:image/svg+xml;base64,${icon}" x="14" y="13" width="30" height="30"/>`
    : `<rect x="14" y="13" width="30" height="30" fill="#3157FF"/><text x="29" y="34" text-anchor="middle" fill="#fff" class="small">${xml(name[0])}</text>`;
  return `<g transform="translate(${x} ${y})"><rect width="208" height="56" rx="14" fill="url(#clayCard)" filter="url(#soft)"/>${iconMarkup}<text x="56" y="34" class="small ink">${xml(name.toUpperCase())}</text></g>`;
}).join("");

const skillLines = [
  ["PROGRAMMING", "Python · FastAPI · C# · .NET Core · REST APIs · Microservices · SQL Server · PostgreSQL · Blazor · Angular"],
  ["GENAI + AGENTS", "GPT · Claude · Qwen · Llama · Prompt Engineering · Function Calling · Structured Outputs · Multi-Agent Systems · LangGraph · LangChain · Semantic Kernel · MCP"],
  ["RAG + MLOPS", "RAG · Hybrid Search · Embeddings · Re-Ranking · Guardrails · Hallucination Reduction · LLM Evaluation · LangSmith · PyTorch · scikit-learn · Hugging Face · MLflow"],
  ["AZURE", "Microsoft Foundry · Azure OpenAI · AI Foundry Agent Service · AI Search · Azure ML · AKS · Functions · APIM · Key Vault · Entra ID · Blob Storage · Azure SQL · Cosmos DB"],
  ["AWS", "Amazon Bedrock · SageMaker · OpenSearch Service · EKS · ECS · Lambda · S3 · IAM · API Gateway · DynamoDB"],
  ["DEVOPS + DELIVERY", "GitHub · GitHub Actions · Docker · Kubernetes · Argo CD · Azure DevOps · CI/CD · OAuth 2.0 · JWT · xUnit · Agile · SDLC"],
].map(([label, skills], index) => {
  const split = skills.length > 125 ? skills.lastIndexOf(" · ", 125) : -1;
  const first = split > 0 ? skills.slice(0, split) : skills;
  const second = split > 0 ? skills.slice(split + 3) : "";
  return `<g transform="translate(42 ${skillsStart + index * 48})"><text class="small blue">${label}</text><text x="190" class="micro ink">${first}</text>${second ? `<text x="190" y="19" class="micro ink">${second}</text>` : ""}</g>`;
}).join("");

const maxEvidence = Math.max(1, ...evidence.values());
const heatmap = techCatalog.map(([name, , , brandColor], index) => {
  const col = index % 10;
  const row = Math.floor(index / 10);
  const x = 42 + col * 112;
  const y = heatStart + row * 78;
  const score = evidence.get(name) || 0;
  const opacity = score ? 0.25 + 0.75 * score / maxEvidence : 0.06;
  return `<g transform="translate(${x} ${y})"><rect width="98" height="48" rx="12" fill="#${brandColor}" fill-opacity="${opacity.toFixed(2)}" stroke="#${brandColor}" stroke-opacity=".48" filter="url(#soft)">${score ? `<animate attributeName="fill-opacity" values="${Math.max(.2, opacity - .18).toFixed(2)};${opacity.toFixed(2)};${Math.max(.2, opacity - .18).toFixed(2)}" dur="4s" begin="${index * .07}s" repeatCount="indefinite"/>` : ""}</rect><text x="49" y="22" text-anchor="middle" class="micro ${score ? "ink" : "muted"}">${xml(truncate(name.toUpperCase(), 13))}</text><text x="49" y="38" text-anchor="middle" class="micro muted">${score} REPOS</text></g>`;
}).join("");

const svg = `<svg width="1200" height="${height}" viewBox="0 0 1200 ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="title desc">
<title id="title">Abhishek Panda — AI Architect Portfolio</title>
<desc id="desc">A dynamically generated technical portfolio with public GitHub metrics, languages, projects, and product work.</desc>
<defs>
  <pattern id="dots" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#3157FF" opacity=".10"/></pattern>
  <clipPath id="portrait"><circle cx="1052" cy="146" r="91"/></clipPath>
  <linearGradient id="paper" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#F8FAFF"/><stop offset=".46" stop-color="#F3F0FF"/><stop offset="1" stop-color="#EDF9F6"/></linearGradient>
  <linearGradient id="clayCard" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#FFFFFF" stop-opacity=".94"/><stop offset="1" stop-color="#E8ECFF" stop-opacity=".82"/></linearGradient>
  <filter id="clay" x="-20%" y="-30%" width="140%" height="170%"><feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#6478C8" flood-opacity=".18"/><feDropShadow dx="-4" dy="-4" stdDeviation="6" flood-color="#FFFFFF" flood-opacity=".95"/></filter>
  <filter id="soft" x="-15%" y="-25%" width="130%" height="150%"><feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#6876AA" flood-opacity=".16"/><feDropShadow dx="-2" dy="-2" stdDeviation="3" flood-color="#FFFFFF" flood-opacity=".9"/></filter>
  <style>
    text{font-family:Courier,monospace}.display{font-family:Verdana,sans-serif;font-weight:900}.ink{fill:#152033}.blue{fill:#3157FF}.muted{fill:#667085}
    .label{font-size:13px;font-weight:700;letter-spacing:2px}.micro{font-size:10px;font-weight:700;letter-spacing:1px}.small{font-size:12px;font-weight:700;letter-spacing:.7px}
    .body{font-size:14px}.metric{font-family:Verdana,sans-serif;font-size:42px;font-weight:900}.repo{font-size:19px;font-weight:700}
  </style>
</defs>
<rect width="1200" height="${height}" rx="24" fill="url(#paper)"/><rect width="1200" height="${height}" rx="24" fill="url(#dots)"/>
<text x="42" y="40" class="label blue">PUBLIC ARCHITECT PORTFOLIO / LIVE SYSTEM</text><text x="1158" y="40" text-anchor="end" class="label ink">@${username.toUpperCase()}</text><path d="M42 58H1158" stroke="#152033" stroke-opacity=".45"/>
<text x="42" y="132" class="display blue" font-size="56">ABHISHEK PANDA</text><text x="44" y="173" class="ink" font-family="Georgia,serif" font-size="24">Engineering intelligence into production.</text>
<text x="44" y="207" class="small ink">LEAD AI ARCHITECT · AGENTIC SYSTEMS · CLOUD PLATFORMS · PRODUCT ENGINEERING</text>
<image href="data:image/jpeg;base64,${portrait}" x="961" y="55" width="182" height="182" preserveAspectRatio="xMidYMid slice" clip-path="url(#portrait)"/><circle cx="1052" cy="146" r="94" fill="none" stroke="#3157FF" stroke-width="3"/>
<path d="M42 264H1158" stroke="#152033" stroke-opacity=".35"/><text x="42" y="300" class="label ink">ENGINEERING POSITION</text>
<text x="42" y="342" class="body ink">12+ YEARS IN SOFTWARE ENGINEERING · 4+ YEARS DELIVERING PRODUCTION GENERATIVE AI, AGENTIC AI + ML</text>
<text x="42" y="370" class="body ink">REGULATED INSURANCE · AUTOMOTIVE INTELLIGENCE · BANKING · AVIATION · ENTERPRISE SUPPORT</text>
<g transform="translate(42 414)">
  <rect width="270" height="112" rx="20" fill="url(#clayCard)" filter="url(#clay)"/><text x="18" y="28" class="small muted">PUBLIC REPOSITORIES</text><text x="18" y="83" class="metric" fill="#3157FF">${repos.length}</text>
  <rect x="282" width="270" height="112" rx="20" fill="url(#clayCard)" filter="url(#clay)"/><text x="300" y="28" class="small muted">OWNED STARS</text><text x="300" y="83" class="metric" fill="#F59E0B">${totalStars.toLocaleString()}</text>
  <rect x="564" width="270" height="112" rx="20" fill="url(#clayCard)" filter="url(#clay)"/><text x="582" y="28" class="small muted">PUBLIC FORKS</text><text x="582" y="83" class="metric" fill="#8B5CF6">${totalForks.toLocaleString()}</text>
  <rect x="846" width="270" height="112" rx="20" fill="url(#clayCard)" filter="url(#clay)"/><text x="864" y="28" class="small muted">ACTIVE / 90 DAYS</text><text x="864" y="83" class="metric" fill="#10A37F">${activeRepos}</text>
</g>
<text x="42" y="580" class="label blue">ARCHITECTURE PRACTICE</text><path d="M42 598H1158" stroke="#152033" stroke-opacity=".22"/>
<g transform="translate(42 630)">
 <text class="repo ink">AGENTIC AI</text><text y="28" class="small muted">ORCHESTRATION · MEMORY · TOOLS · EVALUATION · SAFETY</text>
 <text y="86" class="repo ink">KNOWLEDGE SYSTEMS</text><text y="114" class="small muted">RAG · SEMANTIC SEARCH · INGESTION · GROUNDING · OBSERVABILITY</text>
 <text y="172" class="repo ink">CLOUD PLATFORMS</text><text y="200" class="small muted">EVENT-DRIVEN SERVICES · APIs · DEVSECOPS · RESILIENCE</text>
</g>
<text x="780" y="580" class="label ink">PUBLIC ACTIVITY / 12 WEEKS</text><text x="1158" y="580" text-anchor="end" class="small blue">${activityStreak} WEEK STREAK</text><path d="M780 598H1158" stroke="#152033" stroke-opacity=".22"/>${activityBars}<path d="M780 744H1158" stroke="#152033" stroke-opacity=".25"/>
<text x="42" y="866" class="label blue">LANGUAGE DISTRIBUTION / PUBLIC SOURCE</text><text x="1158" y="866" text-anchor="end" class="small muted">TOP ${topLanguages.length || 0} BY CODE SIZE</text><path d="M42 883H1158" stroke="#152033" stroke-opacity=".22"/>${languageBar}
<text x="42" y="1042" class="label blue">LATEST PUBLIC ENGINEERING</text><text x="1158" y="1042" text-anchor="end" class="small muted">AUTO-SYNCED BY MOST RECENT PUSH</text><path d="M42 1060H1158" stroke="#152033" stroke-opacity=".22"/>
${repoCards}
<text x="42" y="${careerTitleY}" class="label blue">CAREER SYSTEMS / JUL 2015 - PRESENT</text><text x="1158" y="${careerTitleY}" text-anchor="end" class="small muted">EMPLOYER FIRST · CLIENT CONTEXT ON RIGHT</text><path d="M42 ${careerTitleY + 17}H1158" stroke="#152033" stroke-opacity=".22"/>
${careerTimeline}
<text x="42" y="${techTitleY}" class="label blue">TECHNOLOGY INVENTORY / VERIFIED FROM CV</text><text x="1158" y="${techTitleY}" text-anchor="end" class="small muted">OFFICIAL BRAND MARKS + COLORS</text><path d="M42 ${techTitleY + 17}H1158" stroke="#152033" stroke-opacity=".22"/>
${techGrid}
${skillLines}
<text x="42" y="${heatTitleY}" class="label blue">REPOSITORY TECHNOLOGY HEATMAP</text><text x="1158" y="${heatTitleY}" text-anchor="end" class="small muted">DYNAMIC EVIDENCE FROM LANGUAGES · FILES · TOPICS</text><path d="M42 ${heatTitleY + 17}H1158" stroke="#152033" stroke-opacity=".22"/>
${heatmap}
<text x="42" y="${educationY}" class="small ink">EDUCATION  ·  B.TECH COMPUTER SCIENCE &amp; ENGINEERING  ·  BPUT  ·  2010 - 2014</text>
<text x="42" y="${educationY + 30}" class="small ink">CERTIFICATIONS  ·  AZ-305 AZURE SOLUTIONS ARCHITECT EXPERT  ·  AI-103 AZURE AI APPS &amp; AGENTS DEVELOPER</text>
<path d="M42 ${educationY + 50}H1158" stroke="#152033" stroke-opacity=".45"/><text x="42" y="${educationY + 72}" class="micro blue">ARCHITECT FOR CHANGE · INSTRUMENT WHAT MATTERS · AUTOMATE THE REPEATABLE</text><text x="1158" y="${educationY + 72}" text-anchor="end" class="micro muted">REFRESHED ${date(new Date())}</text>
<rect x="1" y="1" width="1198" height="${height - 2}" rx="7" fill="none" stroke="#152033" stroke-opacity=".16"/>
</svg>`;

await mkdir("assets", { recursive: true });
await writeFile("assets/abhishek-panda-portfolio.svg", svg);
console.log(`Generated portfolio for @${username}: ${repos.length} repos, ${totalStars} stars, ${topLanguages.length} languages.`);
