import { FormEvent, useState } from "react";
import { extLookup } from "../../content/console";
import { PAGE_TITLE, type ExtSite } from "../../lib/route";
import { useTitle } from "./Chrome";

export function ExtApp(props: { site: ExtSite; query: string }) {
  useTitle(PAGE_TITLE[props.site]);
  return (
    <div className={`ext ext--${props.site}`}>
      {props.site === "multiscan" && <Multiscan initial={props.query} />}
      {props.site === "detonate" && <Detonate initial={props.query} />}
      {props.site === "ipcheck" && <IpCheck initial={props.query} />}
    </div>
  );
}

function useQuery(initial: string) {
  const [query, setQuery] = useState(initial);
  const [active, setActive] = useState(initial);
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setActive(query.trim());
  };
  return { query, setQuery, active, onSubmit, hit: extLookup(active) };
}

function Multiscan(props: { initial: string }) {
  const q = useQuery(props.initial);
  return (
    <>
      <header className="ext__bar">Multiscan <form onSubmit={q.onSubmit}><input aria-label="URL, file, or hash" value={q.query} onChange={(event) => q.setQuery(event.target.value)} /><button type="submit">Search</button></form></header>
      <main className="ext__main">
        {!q.active && <p>Paste a URL, file name, or hash.</p>}
        {q.active && !q.hit && <p>No results for <span className="mono">{q.active}</span>.</p>}
        {q.hit && (
          <>
            <h1>{q.hit.title}</h1>
            <p className={q.hit.malicious ? "ext__bad" : "ext__ok"}>{q.hit.ratio} engines flagged this {q.hit.malicious ? "as malicious" : "as clean"}.</p>
            <p>{q.hit.summary}</p>
            <h2>Detections</h2>
            <ul>{q.hit.vendors.map((vendor) => <li key={vendor.name}><b>{vendor.name}</b> {vendor.verdict}</li>)}</ul>
            <h2>Relations</h2>
            <ul>{q.hit.relations.map((item) => <li key={item} className="mono">{item}</li>)}</ul>
          </>
        )}
      </main>
    </>
  );
}

function Detonate(props: { initial: string }) {
  const [query, setQuery] = useState(props.initial);
  const [phase, setPhase] = useState<"idle" | "run" | "done">(props.initial ? "done" : "idle");
  const [active, setActive] = useState(props.initial);
  const hit = extLookup(active);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = query.trim();
    setActive(next);
    setPhase("run");
    window.setTimeout(() => setPhase("done"), 900);
  };
  return (
    <>
      <header className="ext__bar">Detonate Lab</header>
      <main className="ext__main">
        <form onSubmit={submit}>
          <input aria-label="Sample or URL" placeholder="Hash or URL" value={query} onChange={(event) => setQuery(event.target.value)} />
          <button type="submit">Analyze</button>
        </form>
        {phase === "run" && <p role="status">Analyzing…</p>}
        {phase === "done" && !hit && <p>No sample named <span className="mono">{active}</span>.</p>}
        {phase === "done" && hit && (
          <>
            <h1>Analysis overview</h1>
            <p>{hit.title} · {hit.summary}</p>
            <p className={hit.malicious ? "ext__bad" : "ext__ok"}>Threat score {hit.malicious ? "malicious" : "clean"} · {hit.ratio}</p>
            <div className="ext__engines">
              {hit.vendors.slice(0, 2).map((vendor) => (
                <article key={vendor.name}><h2>{vendor.name}</h2><p>{vendor.verdict}</p></article>
              ))}
            </div>
            <h2>Relations</h2>
            <ul>{hit.relations.map((item) => <li key={item} className="mono">{item}</li>)}</ul>
          </>
        )}
      </main>
    </>
  );
}

function IpCheck(props: { initial: string }) {
  const q = useQuery(props.initial);
  const ip = q.hit?.ip;
  return (
    <>
      <header className="ext__bar ext__bar--green">
        <form onSubmit={q.onSubmit}>
          <label>Check an address or domain <input aria-label="Address or domain" value={q.query} onChange={(event) => q.setQuery(event.target.value)} /></label>
          <button type="submit">Check</button>
        </form>
      </header>
      <main className="ext__main">
        {ip?.resolvedFrom && <p className="ext__ok">We resolved {ip.resolvedFrom} to {ip.hostname}.</p>}
        {!q.active && <h1>IP Check</h1>}
        {q.active && !ip && <p>No report for <span className="mono">{q.active}</span>.</p>}
        {ip && (
          <>
            <h1>{q.hit?.title} was found in this practice set.</h1>
            <p>Reported <b className="mono">{ip.reports}</b> times. Confidence of abuse is <b className="mono">{ip.confidence}%</b>.</p>
            <dl className="soc-fields">
              <div><dt>ISP</dt><dd>{ip.isp}</dd></div>
              <div><dt>Usage</dt><dd>{ip.usage}</dd></div>
              <div><dt>ASN</dt><dd className="mono">{ip.asn}</dd></div>
              <div><dt>Hostname</dt><dd className="mono">{ip.hostname}</dd></div>
              <div><dt>Country</dt><dd>{ip.country}</dd></div>
            </dl>
          </>
        )}
      </main>
    </>
  );
}
