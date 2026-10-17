(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var form = $("form"), msg = $("msg"), bar = $("bar"), out = $("out"), list = $("list"), jid = null, token = "";
  var LABEL = { quick: "Rápida (~19 sites)", standard: "Padrão (~49 sites, evidências)", full: "Completa (984 sites)" };

  function say(text, err) { msg.textContent = text || ""; msg.className = err ? "err" : ""; }
  function headers() { var h = { "Content-Type": "application/json" }; if (token) h["X-Access-Token"] = token; return h; }

  fetch("/api/config").then(function (r) { return r.json(); }).then(function (c) {
    var sel = $("preset");
    c.presets.forEach(function (p) { var o = document.createElement("option"); o.value = p; o.textContent = LABEL[p] || p; sel.appendChild(o); });
    if (c.requires_token) $("tokenrow").hidden = false;
  }).catch(function () { say("Não foi possível carregar a configuração.", true); });

  function render(d) {
    out.hidden = false; list.textContent = "";
    d.found.forEach(function (f) {
      var li = document.createElement("li"), left = document.createElement("span"), a = document.createElement("a"), b = document.createElement("span");
      left.textContent = f.platform + " ";
      a.textContent = f.url; a.rel = "noopener noreferrer nofollow"; a.target = "_blank";
      if (/^https?:\/\//i.test(f.url)) a.href = f.url;
      b.className = "badge"; b.textContent = f.confidence + "%";
      left.appendChild(a); li.appendChild(left); li.appendChild(b); list.appendChild(li);
    });
    $("count").textContent = "· " + d.found.length + " encontrado(s)";
  }

  function finish(d) {
    $("go").disabled = false; bar.hidden = true;
    if (d.status === "error") { say(d.error || "Falha na busca.", true); return; }
    say("Concluído. " + d.summary.collection.found + " perfis, cobertura " + d.summary.collection.effective_coverage_percent + "%, confiança " + d.summary.confidence + ".");
    var j = $("judg"); j.textContent = "";
    d.summary.judgments.forEach(function (x) { var p = document.createElement("p"); p.textContent = x.text + " [" + x.confidence + "]"; j.appendChild(p); });
    $("dl").hidden = false;
  }

  function poll() {
    fetch("/api/scans/" + jid, { headers: headers() }).then(function (r) {
      if (!r.ok) throw new Error("expirou");
      return r.json();
    }).then(function (d) {
      render(d);
      if (d.status === "running") {
        bar.hidden = false; bar.value = d.total ? Math.round(100 * d.done / d.total) : 0;
        say("Buscando… " + d.done + "/" + (d.total || "?")); setTimeout(poll, 1000);
      } else finish(d);
    }).catch(function () { $("go").disabled = false; bar.hidden = true; say("A busca expirou ou foi interrompida.", true); });
  }

  form.addEventListener("submit", function (ev) {
    ev.preventDefault(); token = $("token").value; out.hidden = true; $("dl").hidden = true; say("Enviando…"); $("go").disabled = true;
    fetch("/api/scans", { method: "POST", headers: headers(), body: JSON.stringify({ target: $("target").value, preset: $("preset").value, lang: "pt" }) })
      .then(function (r) { return r.json().then(function (b) { return { ok: r.ok, b: b }; }); })
      .then(function (r) {
        if (!r.ok) { $("go").disabled = false; say(r.b.error || "Erro.", true); return; }
        jid = r.b.id; poll();
      }).catch(function () { $("go").disabled = false; say("Sem conexão com o servidor.", true); });
  });

  $("dl").addEventListener("click", function (ev) {
    var f = ev.target.getAttribute && ev.target.getAttribute("data-f"); if (!f || !jid) return;
    fetch("/api/scans/" + jid + "/report?format=" + f, { headers: headers() }).then(function (r) {
      var name = (r.headers.get("Content-Disposition") || "").match(/filename="([^"]+)"/);
      return r.blob().then(function (b) { return { b: b, n: name ? name[1] : "mineiro." + f }; });
    }).then(function (x) {
      var u = URL.createObjectURL(x.b), a = document.createElement("a"); a.href = u; a.download = x.n; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(u);
    });
  });
})();
