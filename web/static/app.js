(function () {
  var statusEl = document.getElementById("status");
  var validateOutput = document.getElementById("validateOutput");
  var healthOutput = document.getElementById("healthOutput");
  var btnRefresh = document.getElementById("btnRefresh");
  var btnValidate = document.getElementById("btnValidate");
  var btnHealth = document.getElementById("btnHealth");

  function setLoading(btn, loading) {
    btn.disabled = loading;
    btn.textContent = loading ? "运行中…" : btn.dataset.label || btn.textContent;
  }

  function renderStatus(data) {
    var items = [
      { key: "gateway_18789", label: "Gateway 18789", ok: data.gateway_18789 },
      { key: "cliproxyapi_8080", label: "CLIProxyAPI 8080", ok: data.cliproxyapi_8080 },
      { key: "cliproxyapi_8081", label: "CLIProxyAPI 8081", ok: data.cliproxyapi_8081 },
      { key: "openclaw_config", label: "OpenClaw 配置", ok: data.openclaw_config },
      { key: "cliproxyapi_config", label: "CLIProxyAPI 配置", ok: data.cliproxyapi_config },
    ];
    statusEl.innerHTML = items
      .map(function (i) {
        return (
          '<div class="status-item ' +
          (i.ok ? "ok" : "fail") +
          '">' +
          i.label +
          ": " +
          (i.ok ? "正常" : "未就绪") +
          "</div>"
        );
      })
      .join("");
  }

  function fetchStatus() {
    fetch("/api/status")
      .then(function (r) {
        return r.json();
      })
      .then(renderStatus)
      .catch(function () {
        statusEl.innerHTML = '<div class="status-item fail">无法获取状态</div>';
      });
  }

  btnRefresh.dataset.label = "刷新状态";
  btnRefresh.addEventListener("click", fetchStatus);

  btnValidate.dataset.label = "运行校验";
  btnValidate.addEventListener("click", function () {
    setLoading(btnValidate, true);
    validateOutput.textContent = "运行中…";
    fetch("/api/validate")
      .then(function (r) {
        return r.json();
      })
      .then(function (d) {
        validateOutput.textContent = d.output || (d.ok ? "通过" : "失败");
      })
      .catch(function (e) {
        validateOutput.textContent = "请求失败: " + e.message;
      })
      .finally(function () {
        setLoading(btnValidate, false);
      });
  });

  btnHealth.dataset.label = "运行检查";
  btnHealth.addEventListener("click", function () {
    setLoading(btnHealth, true);
    healthOutput.textContent = "运行中…";
    fetch("/api/health")
      .then(function (r) {
        return r.json();
      })
      .then(function (d) {
        healthOutput.textContent = d.output || (d.ok ? "完成" : "异常");
      })
      .catch(function (e) {
        healthOutput.textContent = "请求失败: " + e.message;
      })
      .finally(function () {
        setLoading(btnHealth, false);
      });
  });

  fetchStatus();
})();
