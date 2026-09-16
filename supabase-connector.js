/* supabase-connector.js — DEPLOY-VEILIGE versie (minimale surface).
 *
 * Deze connector mag precies één ding: pb_events lezen voor het
 * "Staatsblad-signaal"-blok op /zoeken/. Er is bewust GEEN generieke
 * query() of curated()-helper, want dit bestand — en dus het publishable
 * key — staat publiek op de site. Elke bezoeker kan anders in devtools
 * willekeurige tabellen uitlezen.
 *
 * Voor queries op andere tabellen: gebruik de Python-tools
 * (supabase_pull.py / supabase_discover.py) met een eigen key, of voeg hier
 * een expliciete, beperkte helper toe — nooit een generieke query().
 *
 * Gebruik:  <script src="/supabase-connector.js"></script>  vóór de pagina-JS
 */
(function () {
  "use strict";

  var URL = "https://powuskgckzjipfxeidbx.supabase.co";
  var KEY = "sb_publishable_LpXoegKnVZWsoruU3CSZkQ_b9fu31xJ";
  var TABLE = "pb_events";            // enige toegestane tabel

  /* pb_events -> exact de vorm die pbTekst() in zoeken/index.html verwacht:
   *   PB_EVT[digits] = [[type, staatsblad_datum], ...]
   */
  function pbEvents() {
    return fetch(
      URL + "/rest/v1/" + TABLE +
        "?select=kbo,type,datum,pb_bron&limit=5000",
      { headers: { apikey: KEY, Authorization: "Bearer " + KEY } }
    ).then(function (r) {
      if (!r.ok) throw new Error("Supabase HTTP " + r.status);
      return r.json();
    }).then(function (rows) {
      var uit = {};
      rows.forEach(function (r) {
        var d = String(r.kbo || "").replace(/\D/g, "");
        if (!d) return;
        var m = /(\d{4}-\d{2}-\d{2})/.exec(r.pb_bron || "");
        var datum = m ? m[1] : "";
        if (!datum && r.datum) {
          var p = r.datum.split("/");
          if (p.length === 3) datum = p[2] + "-" + p[1] + "-" + p[0];
        }
        (uit[d] = uit[d] || []).push([r.type || "", datum]);
      });
      Object.keys(uit).forEach(function (d) {
        uit[d].sort(function (a, b) {
          return (a[1] || "").localeCompare(b[1] || "");
        });
      });
      return uit;
    });
  }

  window.KBOSupabase = { pbEvents: pbEvents };
})();
