import React, { useState, useEffect, useRef } from 'react';
import OIIcon from '../../icons.jsx';
import { useApp } from '../../context.js';
import { SYSTEM_FLOWS } from '../../data.js';

let _msgId = 0;

const WELCOME_TEXT =
  'Welcome to Operations Intelligence. Select a flow from the catalog to build a report, dashboard, data alert, or notification rule — or type a question and I will assist you.';

function makeMsg(role, type, text, extra) {
  return Object.assign({ id: ++_msgId, role: role, type: type || 'text', text: text || '' }, extra || {});
}

function buildSummary(flow, collected) {
  var lines = ['Here is a summary of your ' + flow.name + ':'];
  flow.steps.forEach(function (step) {
    var val = collected[step.key];
    if (val) {
      lines.push('• ' + step.label + ': ' + val);
    }
  });
  lines.push('\nWould you like to create this?');
  return lines.join('\n');
}

export default function WorkspaceSection(props) {
  var data = props.data || {};
  var ctx = useApp();
  var automations = data.automations || [];

  var [messages, setMessages] = useState([
    makeMsg('assistant', 'text', WELCOME_TEXT),
  ]);
  var [wsInput, setWsInput] = useState('');
  var [chatBusy, setChatBusy] = useState(false);
  var [flowState, setFlowState] = useState({ mode: 'idle', flow: null, step: 0, collected: {} });
  var [autoTriggerBusy, setAutoTriggerBusy] = useState({});

  var chatEndRef = useRef(null);

  useEffect(function () {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, chatBusy]);

  function addAssistantDelayed(text, choices, type, result, items) {
    setChatBusy(true);
    var delay = Math.min(350 + text.length * 7, 1250);
    setTimeout(function () {
      setChatBusy(false);
      setMessages(function (prev) {
        return prev.concat([makeMsg('assistant', type || 'text', text, { choices: choices, result: result, items: items })]);
      });
    }, delay);
  }

  function startFlow(flow) {
    setFlowState({ mode: 'gathering', flow: flow, step: 0, collected: {} });
    var firstStep = flow.steps[0];
    addAssistantDelayed(
      firstStep.question,
      firstStep.type === 'choice' ? firstStep.choices.map(function (c) { return c.label; }) : null,
      'text',
      null,
      null
    );
  }

  function advanceFlow(value) {
    var flow = flowState.flow;
    var step = flowState.step;
    var collected = Object.assign({}, flowState.collected);

    var currentStep = flow.steps[step];
    if (currentStep.type === 'choice') {
      var matched = currentStep.choices.find(function (c) { return c.label === value; });
      collected[currentStep.key] = matched ? matched.value : value;
    } else {
      collected[currentStep.key] = value;
    }

    var nextStep = step + 1;

    if (nextStep >= flow.steps.length) {
      setFlowState({ mode: 'confirming', flow: flow, step: nextStep, collected: collected });
      addAssistantDelayed(buildSummary(flow, collected), null, 'confirm', null, null);
    } else {
      setFlowState({ mode: 'gathering', flow: flow, step: nextStep, collected: collected });
      var nextStepDef = flow.steps[nextStep];
      addAssistantDelayed(
        nextStepDef.question,
        nextStepDef.type === 'choice' ? nextStepDef.choices.map(function (c) { return c.label; }) : null,
        'text',
        null,
        null
      );
    }
  }

  function handleChoiceSelect(msg, choiceLabel) {
    if (flowState.mode !== 'gathering') { return; }
    setMessages(function (prev) {
      return prev.map(function (m) {
        if (m.id === msg.id) {
          return Object.assign({}, m, { choiceSelected: choiceLabel });
        }
        return m;
      });
    });
    setMessages(function (prev) {
      return prev.concat([makeMsg('user', 'text', choiceLabel)]);
    });
    advanceFlow(choiceLabel);
  }

  function handleConfirm() {
    var flow = flowState.flow;
    var collected = flowState.collected;
    setFlowState(function (prev) { return Object.assign({}, prev, { mode: 'creating' }); });
    setChatBusy(true);

    ctx.callServer({
      action: 'create_deliverable',
      flow_id: flow.id,
      collected: JSON.stringify(collected),
    }).then(function (res) {
      setChatBusy(false);
      var data = res && res.data ? res.data : res;
      var resultObj = data && data.result ? data.result : null;
      var text = (data && data.message) || ('Your ' + flow.name + ' has been created successfully.');
      setFlowState({ mode: 'idle', flow: null, step: 0, collected: {} });
      setMessages(function (prev) {
        return prev.concat([makeMsg('assistant', 'result', text, { result: resultObj })]);
      });
    }).catch(function (err) {
      setChatBusy(false);
      var errMsg = err && (err.message || String(err)) || 'An error occurred while creating your deliverable.';
      setFlowState({ mode: 'idle', flow: null, step: 0, collected: {} });
      setMessages(function (prev) {
        return prev.concat([makeMsg('assistant', 'error', errMsg)]);
      });
    });
  }

  function handleCancel() {
    setFlowState({ mode: 'idle', flow: null, step: 0, collected: {} });
    addAssistantDelayed('No problem. Select another flow from the catalog or ask me a question.', null, 'text', null, null);
  }

  function handleSend() {
    var q = wsInput.trim();
    if (!q || chatBusy) { return; }
    setMessages(function (prev) {
      return prev.concat([makeMsg('user', 'text', q)]);
    });
    setWsInput('');

    if (flowState.mode === 'gathering') {
      advanceFlow(q);
      return;
    }

    setChatBusy(true);
    ctx.callServer({ action: 'assistant_query', query: q }).then(function (res) {
      setChatBusy(false);
      var data = res && res.data ? res.data : res;
      var reply = (data && data.reply) || 'I could not process that request.';
      var items = (data && data.items) || null;
      setMessages(function (prev) {
        return prev.concat([makeMsg('assistant', items ? 'catalog' : 'text', reply, { items: items })]);
      });
    }).catch(function (err) {
      setChatBusy(false);
      var errMsg = err && (err.message || String(err)) || 'An error occurred.';
      setMessages(function (prev) {
        return prev.concat([makeMsg('assistant', 'error', errMsg)]);
      });
    });
  }

  function handleInputKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function triggerGroupAutomation(automation) {
    var sysId = automation.sys_id;
    setAutoTriggerBusy(function (prev) {
      var next = Object.assign({}, prev);
      next[sysId] = true;
      return next;
    });
    ctx.callServer({
      action: 'trigger_automation',
      automation_sys_id: sysId,
      group_sys_id: automation.group_sys_id,
    }).then(function () {
      setAutoTriggerBusy(function (prev) {
        var next = Object.assign({}, prev);
        next[sysId] = false;
        return next;
      });
    }).catch(function () {
      setAutoTriggerBusy(function (prev) {
        var next = Object.assign({}, prev);
        next[sysId] = false;
        return next;
      });
    });
  }

  var activeFlow = flowState.flow;
  var isGathering = flowState.mode === 'gathering';
  var isConfirming = flowState.mode === 'confirming';
  var isCreating = flowState.mode === 'creating';

  var progressPct = activeFlow
    ? Math.round((flowState.step / activeFlow.steps.length) * 100)
    : 0;

  return (
    <div className="oi-section">
      <div className="oi-workspace-layout">
        {/* LEFT PANEL */}
        <div className="oi-ws-catalog-panel">
          <div className="oi-ws-catalog-head">
            <div className="oi-ws-catalog-title">Automation Catalog</div>
          </div>

          {activeFlow ? (
            /* Flow progress tracker */
            <div className="oi-ws-catalog-body">
              <div className="oi-ws-flow-active">
                <div className="oi-ws-flow-active-header">
                  <div
                    className="oi-ws-flow-active-icon"
                    style={{ background: activeFlow.color + '22', color: activeFlow.color }}
                  >
                    <OIIcon name={activeFlow.icon} size={20} fill={activeFlow.color} />
                  </div>
                  <div className="oi-ws-flow-active-meta">
                    <div className="oi-ws-flow-active-name">{activeFlow.name}</div>
                    <div className="oi-ws-flow-active-step">
                      Step {Math.min(flowState.step + 1, activeFlow.steps.length)} of {activeFlow.steps.length}
                    </div>
                  </div>
                </div>
                <div className="oi-ws-flow-progress-bar-wrap">
                  <div
                    className="oi-ws-flow-progress-bar"
                    style={{ width: progressPct + '%', background: activeFlow.color }}
                  />
                </div>
                <div className="oi-ws-flow-step-list">
                  {activeFlow.steps.map(function (step, idx) {
                    var isDone = idx < flowState.step;
                    var isActive = idx === flowState.step;
                    return (
                      <div
                        key={step.key}
                        className={
                          'oi-ws-flow-step-item' +
                          (isDone ? ' done' : '') +
                          (isActive ? ' active' : '')
                        }
                      >
                        <div className="oi-ws-flow-step-dot">
                          {isDone ? <OIIcon name="check" size={10} fill="#FFFFFF" /> : null}
                        </div>
                        <div className="oi-ws-flow-step-label">{step.label}</div>
                      </div>
                    );
                  })}
                </div>
                <button
                  className="oi-btn ghost xs"
                  style={{ marginTop: '1rem', width: '100%' }}
                  onClick={handleCancel}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* Catalog list */
            <div className="oi-ws-catalog-body">
              <div className="oi-catalog-section">
                <div className="oi-catalog-section-title">System Flows</div>
                <div className="oi-flow-list">
                  {SYSTEM_FLOWS.map(function (flow) {
                    return (
                      <div
                        key={flow.id}
                        className="oi-flow-item"
                        onClick={function () { startFlow(flow); }}
                      >
                        <div
                          className="oi-flow-item-icon"
                          style={{ background: flow.color + '22', color: flow.color }}
                        >
                          <OIIcon name={flow.icon} size={18} fill={flow.color} />
                        </div>
                        <div className="oi-flow-item-body">
                          <div className="oi-flow-item-name">{flow.name}</div>
                          <div className="oi-flow-item-desc">{flow.desc}</div>
                        </div>
                        <div className="oi-flow-item-arrow">
                          <OIIcon name="chevron_right" size={16} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {automations.length > 0 && (
                <div className="oi-catalog-section">
                  <div className="oi-catalog-section-title">Group Automations</div>
                  <div className="oi-flow-list">
                    {automations.map(function (automation) {
                      var busy = !!autoTriggerBusy[automation.sys_id];
                      return (
                        <div key={automation.sys_id} className="oi-flow-item">
                          <div className="oi-flow-item-icon">
                            <OIIcon name="automation" size={18} />
                          </div>
                          <div className="oi-flow-item-body">
                            <div className="oi-flow-item-name">{automation.name}</div>
                            {automation.description && (
                              <div className="oi-flow-item-desc">{automation.description}</div>
                            )}
                          </div>
                          <button
                            className="oi-btn primary xs"
                            disabled={busy}
                            onClick={function () { triggerGroupAutomation(automation); }}
                          >
                            {busy ? (
                              <div className="oi-spinner sm" />
                            ) : (
                              <OIIcon name="play" size={14} />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT PANEL */}
        <div className="oi-ws-assistant-panel">
          <div className="oi-ws-assistant-head">
            <div className="oi-ws-assistant-icon-wrap">
              <OIIcon name="assistant" size={22} fill="#00BF6F" />
            </div>
            <div>
              <div className="oi-ws-assistant-name">Operations Assistant</div>
              <div className="oi-ws-assistant-tagline">Your intelligent operations guide</div>
            </div>
          </div>

          <div className="oi-chat-messages">
            {messages.map(function (msg) {
              if (msg.role === 'user') {
                return (
                  <div key={msg.id} className="oi-chat-msg user">
                    <div className="oi-chat-bubble">{msg.text}</div>
                  </div>
                );
              }

              if (msg.type === 'result' && msg.result) {
                return (
                  <div key={msg.id} className="oi-chat-msg assistant">
                    <div className="oi-chat-bubble">
                      {msg.text}
                      <div className="oi-result-card">
                        <div className="oi-result-card-icon">
                          <OIIcon name="check" size={18} fill="#00BF6F" />
                        </div>
                        <div className="oi-result-card-body">
                          {msg.result.name && (
                            <div className="oi-result-card-name">{msg.result.name}</div>
                          )}
                          {msg.result.type_label && (
                            <div className="oi-result-card-type">{msg.result.type_label}</div>
                          )}
                          {msg.result.url && (
                            <a
                              className="oi-result-card-link"
                              href={msg.result.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Open <OIIcon name="launch" size={12} />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              if (msg.type === 'error') {
                return (
                  <div key={msg.id} className="oi-chat-msg assistant">
                    <div className="oi-chat-bubble oi-chat-bubble-error">
                      <OIIcon name="error_icon" size={14} fill="#D92D20" />
                      {' '}{msg.text}
                    </div>
                  </div>
                );
              }

              if ((msg.type === 'catalog' || msg.type === 'knowledge' || msg.type === 'requests') && msg.items && msg.items.length > 0) {
                return (
                  <div key={msg.id} className="oi-chat-msg assistant">
                    <div className="oi-chat-bubble">
                      {msg.text}
                      <div className="oi-chat-items">
                        {msg.items.map(function (item, idx) {
                          return (
                            <div key={idx} className="oi-chat-item-card">
                              <div className="oi-chat-item-card-name">{item.name || item.title}</div>
                              {(item.description || item.desc) && (
                                <div className="oi-chat-item-card-desc">{item.description || item.desc}</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={msg.id} className="oi-chat-msg assistant">
                  <div className="oi-chat-bubble">
                    {msg.text}
                    {msg.choices && msg.choices.length > 0 && (
                      <div className="oi-chat-choices">
                        {msg.choices.map(function (choice, idx) {
                          var isSelected = msg.choiceSelected === choice;
                          var inactive = !!msg.choiceSelected && !isSelected;
                          return (
                            <button
                              key={idx}
                              className={
                                'oi-choice-btn' +
                                (isSelected ? ' selected' : '') +
                                (inactive ? ' dimmed' : '')
                              }
                              disabled={!!msg.choiceSelected || flowState.mode !== 'gathering'}
                              onClick={function () { handleChoiceSelect(msg, choice); }}
                            >
                              {choice}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {chatBusy && (
              <div className="oi-chat-msg assistant">
                <div className="oi-chat-bubble oi-typing">
                  <span className="oi-dot" />
                  <span className="oi-dot" />
                  <span className="oi-dot" />
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {isConfirming ? (
            <div className="oi-chat-confirm-area">
              <button
                className="oi-btn primary"
                disabled={chatBusy}
                onClick={handleConfirm}
              >
                Yes, create it
              </button>
              <button
                className="oi-btn ghost"
                disabled={chatBusy}
                onClick={handleCancel}
              >
                Start Over
              </button>
            </div>
          ) : isCreating ? (
            <div className="oi-chat-creating-area">
              <div className="oi-spinner sm" />
              <span>Creating your deliverable&hellip;</span>
            </div>
          ) : (
            <div className="oi-chat-input-area">
              <input
                className="oi-input"
                type="text"
                placeholder={isGathering ? 'Type your answer…' : 'Type your message…'}
                value={wsInput}
                onChange={function (e) { setWsInput(e.target.value); }}
                onKeyDown={handleInputKeyDown}
                disabled={chatBusy}
              />
              <button
                className="oi-btn primary"
                style={{ flexShrink: 0, minWidth: '2.625rem', padding: '0.625rem' }}
                onClick={handleSend}
                disabled={chatBusy || !wsInput.trim()}
              >
                <OIIcon name="send" size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
