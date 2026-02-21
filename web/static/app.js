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
      { key: "cliproxyapi_8317", label: "CLIProxyAPI 8317", ok: data.cliproxyapi_8317 },
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

  // 常用命令
  var commandsList = document.getElementById("commandsList");
  function renderCommands(commands) {
    if (!commands || !commands.length) return;
    commandsList.innerHTML = commands
      .map(function (c) {
        var note = c.note ? '<span class="cmd-note">' + c.note + "</span>" : "";
        var runBtn = c.runnable
          ? '<button type="button" class="btn btn-sm" data-cmd-id="' + c.id + '">执行</button>'
          : "";
        return (
          '<div class="cmd-row">' +
          '<div class="cmd-main">' +
          '<span class="cmd-label">' + c.label + "</span>" +
          note +
          "</div>" +
          '<div class="cmd-actions">' +
          '<button type="button" class="btn btn-sm btn-copy" data-cmd="' + escapeHtml(c.cmd) + '">复制</button> ' +
          runBtn +
          "</div>" +
          '<code class="cmd-text">' + escapeHtml(c.cmd) + "</code>" +
          "</div>"
        );
      })
      .join("");
    commandsList.querySelectorAll(".btn-copy").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var cmd = btn.dataset.cmd;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(cmd).then(function () {
            btn.textContent = "已复制";
            setTimeout(function () {
              btn.textContent = "复制";
            }, 1500);
          });
        } else {
          prompt("复制以下命令：", cmd);
        }
      });
    });
    commandsList.querySelectorAll("[data-cmd-id]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.dataset.cmdId;
        var orig = btn.textContent;
        btn.disabled = true;
        btn.textContent = "运行中…";
        fetch("/api/run/" + id)
          .then(function (r) {
            return r.json();
          })
          .then(function (d) {
            alert(d.ok ? "执行完成" : "执行失败\n\n" + (d.output || ""));
          })
          .catch(function (e) {
            alert("请求失败: " + e.message);
          })
          .finally(function () {
            btn.disabled = false;
            btn.textContent = orig;
          });
      });
    });
  }
  function escapeHtml(s) {
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }
  fetch("/api/commands")
    .then(function (r) {
      return r.json();
    })
    .then(function (d) {
      renderCommands(d.commands || []);
    })
    .catch(function () {
      commandsList.innerHTML = '<p class="muted">无法加载命令列表</p>';
    });
})();
