/* ==========================================================
   EOL 停产雷达 · 落地页脚本
   试点申请表单：前端校验 + POST /api/pilot-signup + 静态降级
   ========================================================== */

(function () {
  "use strict";

  /* 试点申请表单提交地址（隧道 API）。
     当前为 trycloudflare 临时隧道；生产域名上线后改为生产域名地址。
     注意：隧道重启后 URL 会变，需同步更新此处并重新部署。 */
  var FORM_ENDPOINT = "https://prediction-sip-varying-food.trycloudflare.com/api/pilot-signup";
  /* 降级联系方式占位符 —— 上线前替换为真实邮箱 */
  var FALLBACK_EMAIL = "【邮箱】";

  var form = document.getElementById("pilot-form");
  if (!form) return;

  var submitBtn = document.getElementById("pilot-submit");
  var resultBox = document.getElementById("form-result");

  /* ---------- 工具 ---------- */

  function setError(inputId, message) {
    var input = document.getElementById(inputId);
    var errEl = form.querySelector('.field-error[data-for="' + inputId + '"]');
    if (input) input.classList.toggle("invalid", !!message);
    if (errEl) errEl.textContent = message || "";
  }

  function clearErrors() {
    ["f-company", "f-contact", "f-phone", "f-count", "f-message"].forEach(function (id) {
      setError(id, "");
    });
  }

  function showResult(kind, html) {
    resultBox.className = "form-result show " + kind;
    resultBox.innerHTML = html;
  }

  function hideResult() {
    resultBox.className = "form-result";
    resultBox.textContent = "";
  }

  /* ---------- 校验 ---------- */

  function validate() {
    clearErrors();
    var ok = true;

    var company = document.getElementById("f-company").value.trim();
    var contact = document.getElementById("f-contact").value.trim();
    var phone = document.getElementById("f-phone").value.trim();
    var countRaw = document.getElementById("f-count").value.trim();

    if (!company) {
      setError("f-company", "请填写公司名称");
      ok = false;
    }
    if (!contact) {
      setError("f-contact", "请填写联系人");
      ok = false;
    }
    if (!phone) {
      setError("f-phone", "请填写电话或微信，方便我们 48 小时内联系您");
      ok = false;
    } else if (phone.length < 5) {
      setError("f-phone", "联系方式看起来太短了，请确认一下");
      ok = false;
    }

    var count = null;
    if (countRaw !== "") {
      count = Number(countRaw);
      if (!Number.isInteger(count) || count < 1) {
        setError("f-count", "请填写大于 0 的整数（不确定可留空）");
        ok = false;
      }
    }

    return {
      ok: ok,
      payload: {
        company: company,
        contact: contact,
        phone_or_wechat: phone,
        material_count_est: count,
        message: document.getElementById("f-message").value.trim()
      }
    };
  }

  /* ---------- 提交 ---------- */

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    hideResult();

    var result = validate();
    if (!result.ok) return;

    submitBtn.disabled = true;
    submitBtn.textContent = "提交中…";

    fetch(FORM_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result.payload)
    })
      .then(function (resp) {
        if (!resp.ok) throw new Error("HTTP " + resp.status);
        showResult(
          "ok",
          "已收到，我们会在 <strong>48 小时内</strong>联系您，请保持电话或微信畅通。"
        );
        form.reset();
      })
      .catch(function () {
        /* 纯静态打开（无后端）或网络失败时降级 */
        showResult(
          "fallback",
          "当前页面未连接提交服务。请将以上信息发送至 <strong>" +
            FALLBACK_EMAIL +
            "</strong>，我们同样会在 48 小时内联系您。"
        );
      })
      .then(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = "提交试点申请";
      });
  });

  /* 输入时即时清除该字段错误 */
  form.addEventListener("input", function (event) {
    if (event.target && event.target.id) {
      setError(event.target.id, "");
    }
  });
})();
