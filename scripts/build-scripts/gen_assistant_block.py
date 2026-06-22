# -*- coding: utf-8 -*-
import io, re

# Each topic: (keywords_list, reply_text)
# reply_text uses \n and \n- as in the JS string. We emit JS string concatenation safe.

TOPICS = []

def T(keys, reply):
    TOPICS.append((keys, reply))

# ============ GREETINGS & CONVERSATION ============
T(['hello there','hiya','hey assistant','good day','greetings to you','hi assistant'],
  "Hello! I am your Operations Assistant. I can help with service requests, incidents, approvals, change and problem management, knowledge articles, automations, executions, group memberships, and platform navigation. What would you like to do?")
T(['how are you','hows it going','how is it going','how do you do','you doing well','how are things'],
  "I am ready and working well, thank you for asking! I am here to help you with requests, incidents, approvals, automations, and anything else across the Operations Intelligence platform. What can I do for you?")
T(['goodbye','bye now','see you','see ya','farewell','talk later','catch you later','have a good day'],
  "Goodbye! It was a pleasure assisting you. Come back any time you need help with requests, incidents, approvals, or automations. Have a great day!")
T(['what is your name','whats your name','who are you','introduce yourself','your name'],
  "I am your Operations Assistant, built into the Operations Intelligence portal. I help you navigate service management, run automations, and find answers across the platform. How can I help?")
T(['are you a bot','are you human','are you an ai','are you real','are you a robot','are you a person'],
  "I am the Operations Assistant, a digital helper inside the Operations Intelligence portal. I am here around the clock to help you with requests, incidents, approvals, and automations. What do you need?")
T(['you are amazing','youre amazing','great job','well done','awesome work','you are great','youre the best','nicely done','good bot'],
  "Thank you, that is very kind! I am always glad to help. Let me know what else you need and I will do my best.")
T(['i am frustrated','im frustrated','this is broken','nothing works','so annoying','this is useless','i am stuck','im stuck','this is frustrating'],
  "I understand, and I am sorry this has been frustrating. Let me help you fix it. Tell me what you are trying to do, or say \"Create an incident\" to log the issue with IT and get it tracked. We will get this sorted.")
T(['sorry','excuse me','my apologies','my bad','pardon me'],
  "No problem at all! There is nothing to apologise for. Just let me know what you would like to do and I will help right away.")
T(['tell me a joke','say something funny','make me laugh','know any jokes','a joke please'],
  "Here is one: Why did the incident cross the road? To get escalated on the other side! Now, back to business, how can I help you with your requests or tickets today?")
T(['what day is it','what time is it','what is the date','current time','todays date','what is today'],
  "I do not track live clock or calendar details reliably, but you can always see the current date and time in the top corner of the portal. Is there a request, incident, or automation I can help you with?")
T(['repeat that','say again','say that again','pardon','come again','i did not catch that','didnt catch that'],
  "Of course, let me know what you would like me to clarify. You can also rephrase your question and I will do my best to help with requests, incidents, approvals, or knowledge articles.")

# ============ INCIDENT MANAGEMENT ============
T(['report a problem','log an issue with it','open a new ticket','raise a new ticket','i need to report','start an incident'],
  "To report an issue, open the Service Portal and choose \"Report an Issue\" at /sp?id=new_call. Include a clear description, when it started, how many people are affected, and any error messages. For critical outages, call the IT helpdesk directly so it can be triaged immediately.")
T(['incident priority','priority levels','what is p1','what is p2','what is p3','what is p4','critical severity','high priority','medium priority','low priority'],
  "Incident priority is set from impact and urgency:\n- P1 Critical: major business impact, widespread outage, needs immediate response\n- P2 High: significant impact to a department or key service\n- P3 Moderate: limited impact, normal business operation continues\n- P4 Low: minor inconvenience with an easy workaround\nP1 and P2 attract the fastest SLA targets and the most active communication.")
T(['incident states','incident status','what are incident states','incident lifecycle','incident state meaning'],
  "Incident states track progress:\n- New: logged, not yet assigned\n- In Progress: actively being worked\n- On Hold: paused, waiting on a user, vendor, or change\n- Resolved: a fix is in place, pending confirmation\n- Closed: confirmed resolved and finalised\nUse \"Check INC0001234\" to see the current state of a specific incident.")
T(['assign incident','reassign incident','transfer incident','change assignment','assign to someone','reassign ticket'],
  "To reassign an incident, open the record and update the Assignment Group, then the Assigned To field. Add a brief work note explaining why you are reassigning so the next person has context. If you cannot edit assignment, the fulfiller group manager or the service desk can do it for you.")
T(['escalate incident','escalation','escalate to management','need escalation','raise priority','escalate ticket'],
  "To escalate, first add a work note explaining the business impact and urgency, then raise the priority or notify the assignment group manager. For severe or stalled issues, contact the service desk and request management escalation. For a major outage, say \"major incident\" for the war-room procedure.")
T(['major incident','severity 1','all hands','war room','crisis','sev 1','sev1','bridge call','p1 outage'],
  "Major Incident Management (MIM) handles critical, high-impact events. Steps:\n1. Declare the major incident and notify the MIM coordinator\n2. Open a war room or bridge call\n3. Assign a dedicated communications lead for stakeholder updates\n4. Engage all relevant technical teams in parallel\n5. Track all actions on the incident record\nAfter resolution, a post-incident review is mandatory.")
T(['incident template','incident category','categorize incident','incident categorization','pick a category'],
  "Choose the category that best matches the affected service, for example Hardware, Software, Network, or Access. Accurate categorisation routes the incident to the right team and improves reporting. If unsure, pick the closest match and the assignment group can re-categorise.")
T(['work notes','additional comments','add note to incident','internal notes','customer comments','comments vs work notes'],
  "There are two note types:\n- Work Notes are internal and visible only to fulfillers and agents\n- Additional Comments (Customer Visible) are sent to the requester and appear in their portal\nUse Additional Comments to update the user, and Work Notes for technical detail and handover context.")
T(['close incident','resolve incident','mark resolved','resolve a ticket','close a ticket','complete incident'],
  "To resolve an incident, set the state to Resolved, choose a resolution code, and write a clear resolution note describing what fixed the issue. The requester is then asked to confirm. After a confirmation window with no objection, the incident moves to Closed automatically.")
T(['reopen incident','issue came back','reopening','not resolved','problem returned','reopen ticket'],
  "If a resolved incident recurs, you can reopen it from the record while it is still in the confirmation window. If it has already closed, raise a new incident and reference the original number in the description so the team has the history. Persistent recurrence may warrant a Problem record.")
T(['link to problem','related problem','problem record','problem management from incident','attach to problem'],
  "To link an incident to a Problem, open the incident and set the Problem field, or create a new Problem from the incident using the related action. Linking groups recurring incidents under a single root-cause investigation and lets the fix close them together.")
T(['incident metrics','mean time to resolve','mttr','incident kpis','resolution time metrics','response time metrics','mtti'],
  "Key incident metrics include:\n- MTTR (Mean Time To Resolve): average time from logged to resolved\n- MTTI (Mean Time To Identify): time to diagnose\n- Volume and backlog by priority\n- SLA compliance percentage\nView these in Performance Analytics dashboards or build a report from the Studio section.")
T(['on hold incident','waiting for vendor','waiting for user','pending reason','why on hold','put on hold'],
  "Setting an incident On Hold requires a reason, typically: Awaiting Caller, Awaiting Vendor, Awaiting Change, or Awaiting Problem. The SLA clock can pause while on hold. Always add a work note explaining what you are waiting for and the expected follow-up date.")
T(['impact urgency','how is priority calculated','priority matrix','impact and urgency','priority formula'],
  "Priority is derived from a matrix of Impact (how widespread) and Urgency (how time-sensitive). For example, High Impact plus High Urgency yields P1, while Low Impact plus Low Urgency yields P4. Set Impact and Urgency accurately and the priority calculates automatically.")
T(['sla on incident','incident sla breach','sla warning on incident','incident overdue','sla clock'],
  "Each incident has SLA timers for response and resolution based on its priority. As a target nears breach you receive a warning, and a breach triggers escalation notifications to the assignment group and its manager. Keep the incident moving and use On Hold appropriately to manage the clock.")
T(['communication plan','update stakeholders','notify user','incident notification','keep informed','stakeholder update'],
  "Keep stakeholders informed using Additional Comments for the requester and broadcast updates for major incidents. A good cadence is an update at acknowledgement, at diagnosis, and at resolution, plus regular intervals for P1 events. Assign a communications lead for major incidents.")
T(['incident history','timeline','audit trail','who made changes','change history','incident activity log'],
  "Every incident keeps a full activity log and audit history. Open the record and view the Activity stream to see all field changes, notes, and state transitions with timestamps and the user who made them. This is the authoritative record for handovers and reviews.")
T(['duplicate incident','merge incidents','same issue twice','consolidate incidents','combine tickets'],
  "If multiple incidents report the same issue, keep one as the primary and mark the others as duplicates referencing the primary number. For widespread events, link the duplicates to a single Problem or major incident so updates and the resolution cascade to all affected users.")
T(['post mortem','pir','post incident review','incident review','lessons learned','retrospective'],
  "A Post-Incident Review (PIR) captures what happened, the timeline, the root cause, and improvement actions. Schedule it soon after resolution for any major incident, invite the responders and service owners, and record action items with owners and due dates so lessons translate into prevention.")
T(['mass ticket','flood of incidents','surge','many tickets','incident storm','high ticket volume'],
  "During an incident surge, look for a common cause and consider declaring a major incident to consolidate effort. Link related tickets to a single Problem or parent so one fix and one communication covers them all, and use a broadcast message to reduce inbound duplicates.")

# ============ SERVICE REQUESTS & CATALOG ============
T(['browse service catalog','view catalog','service catalog home','what can i request','open catalog','see the catalog'],
  "Browse the Service Catalog at /sp?id=sc_home. Items are grouped into categories such as Hardware, Software, Access, and Facilities. Use the search bar at the top to find an item quickly, then open it to see the form and any approval requirements before you submit.")
T(['submit request','raise request','order something','catalog order','place an order','how to submit a request'],
  "To submit a request, open the Service Catalog at /sp?id=sc_home, select the item, complete the form fields, and click Order Now or Add to Cart. After submission you receive a request (REQ) number and one or more requested items (RITMs) to track fulfilment.")
T(['track my request','request status','where is my request','request update','check request','request progress'],
  "To track a request, say \"Show my requests\" here, or open /sp?id=requests. Each request shows its stage, the requested items, any pending approvals, and the assigned fulfiller. Click an item for its full activity history and expected delivery.")
T(['cancel request','withdraw request','remove request','stop my request','call off request'],
  "To cancel a request, open it from /sp?id=requests and use the Cancel option if it is still available, or add a comment asking the fulfiller to cancel. Requests already in fulfilment may need fulfiller action to stop, so add a clear note explaining you want to withdraw it.")
T(['modify request','change request details','update my request','edit my request','amend request'],
  "Once submitted, most request fields are locked, but you can add a comment to the requested item asking the fulfiller to adjust details. If the change is significant, it may be easier to cancel and resubmit. Open your request at /sp?id=requests to add a comment.")
T(['order on behalf','request for someone else','submit for colleague','proxy request','request for another'],
  "Many catalog items include a \"Requested For\" field so you can order on behalf of a colleague. Select their name in that field before submitting. If the item lacks that field, contact the service desk to place a proxy order or ask the colleague to submit it themselves.")
T(['catalog categories','catalog sections','request types','catalog structure','types of requests'],
  "The catalog is organised into categories like Hardware, Software, Access, Facilities, and HR Services. Each category groups related items to make them easy to find. Browse categories from /sp?id=sc_home or use the search bar if you already know the item name.")
T(['fulfillment','delivery','when will i get','how long does it take','estimated delivery','delivery time'],
  "Fulfilment time depends on the item and any approvals. Software access is often same-day, while hardware may take several business days for procurement and setup. Each catalog item shows an estimated delivery, and your request page tracks the live fulfilment stage.")
T(['request item','requested items','what is a ritm','ritm','req vs ritm'],
  "A Request (REQ) is the overall order, while a Requested Item (RITM) is each individual item within it. One request can contain several RITMs, each fulfilled separately with its own tasks and approvals. Track both from /sp?id=requests.")
T(['catalog approval','request needs approval','who approves my request','request approval routing','approval for catalog'],
  "Approval routing depends on the item. Many requests route to your manager, and some also require a service or budget owner. You can see required approvals on the item before submitting, and track approval progress on your request page once it is submitted.")
T(['catalog item not visible','item missing from catalog','cannot find item','item not showing','catalog item hidden'],
  "If an item is missing, it may be restricted to certain roles, groups, or locations, or it may be inactive. Try the catalog search at /sp?id=sc_home, and if you still cannot find it, contact the service desk to confirm your eligibility or request that the item be made available.")
T(['subscription','recurring request','renewal','recurring item','subscription service'],
  "Some catalog items are subscriptions that recur or require periodic renewal, such as software licences. These are tracked so you receive renewal reminders before expiry. Check your active subscriptions on your request history, or contact the service owner about renewal terms.")
T(['order guide','related items','multi-item request','bundle request','order multiple items'],
  "An Order Guide bundles several related items into one guided flow, for example a new-hire package with a laptop, accounts, and access. It walks you through each item and submits them together. Look for order guides in the catalog when you need a coordinated set of items.")
T(['pricing','cost','chargeback','show back','catalog price','how much does it cost'],
  "Some catalog items display a price for budgeting or chargeback, where costs are allocated to your department. Where shown, the price appears on the item form. For questions about charges or cost centres, contact the service owner or your finance partner.")
T(['request closed','request completed','request fulfilled','request received','order complete'],
  "A completed request means all its requested items have been fulfilled and delivered. You will receive a notification, and the request shows as Closed Complete. If you have everything you expected, no action is needed; if something is missing, add a comment or raise a new request.")
T(['request rejected','denied request','why was my request rejected','request declined','rejected order'],
  "If a request is rejected, the approver usually adds a reason in the comments. Open your request at /sp?id=requests to read it. You can address the reason and submit a new request, or contact the approver directly to discuss before resubmitting.")
T(['request on hold','pending fulfillment','fulfillment on hold','request paused','request waiting'],
  "A request on hold is typically waiting on information, an approval, stock, or a dependency. Open the requested item to see the hold reason and any fulfiller notes. Add a comment if you can provide what is needed to move it forward.")
T(['closed incomplete','fulfillment issue','request failed','could not fulfill','fulfilment problem'],
  "If a request closes as incomplete, fulfilment could not be finished as ordered. Read the closing notes on the requested item to understand why. If you still need the item, raise a new request referencing the original, or contact the service desk to escalate.")

# ============ CHANGE MANAGEMENT ============
T(['create change','raise change','new change','change ticket request','log a change','open a change'],
  "To create a Change Request, open the Service Catalog and search for \"Change Request\", or use your change tooling at /sp?id=sc_cat_item&sysparm_category=change. Provide a description, justification, implementation plan, back-out plan, risk, and a proposed change window. Choose the change type that fits the work.")
T(['change types','standard change','normal change','emergency change','change categories','types of change'],
  "There are three change types:\n- Standard: pre-approved, low-risk, repeatable, no CAB needed\n- Normal: assessed and approved through the CAB based on risk\n- Emergency: expedited for urgent fixes, with retrospective review\nPick the type that matches the risk and urgency of your work.")
T(['change approval','cab','change advisory board','change board','approve a change','change sign off'],
  "The Change Advisory Board (CAB) reviews normal changes for risk, impact, scheduling, and readiness. Participants typically include change managers, service owners, and technical leads. Submit your change with a complete plan ahead of the CAB so it can be assessed and approved without delay.")
T(['change window','maintenance window','scheduled maintenance','downtime window','change schedule','planned downtime'],
  "Schedule changes within an approved maintenance window to minimise disruption, usually outside core business hours. Record the planned start and end on the change, check for conflicts on the change calendar, and notify affected users in advance of any expected downtime.")
T(['change risk','risk assessment','change impact','change risk score','assess change risk'],
  "Change risk is assessed from impact, likelihood of failure, scope, and the robustness of the back-out plan. A higher risk score usually requires more approvals and a stricter window. Complete the risk questions honestly so the CAB can make an informed decision.")
T(['implementation plan','implementation steps','change procedure','how to implement change','change steps'],
  "A good implementation plan lists ordered, specific steps: pre-checks, the change actions, validation steps, and who performs each. Include timings, required access, and decision points. A clear plan speeds CAB approval and reduces errors during execution.")
T(['rollback','back out plan','undo change','reverse change','backout','rollback plan'],
  "Every change should have a back-out plan describing how to restore the previous state if it fails, including the trigger conditions and the steps to revert. Test the back-out where possible. CAB will expect a credible rollback before approving a normal or emergency change.")
T(['emergency change','expedited change','urgent change','break fix','emergency cab','ecab'],
  "An emergency change addresses an urgent issue, such as a P1 fix, with an expedited approval through the Emergency CAB (ECAB). Document the justification, implement quickly with appropriate oversight, and complete a retrospective review afterwards to confirm it was warranted and successful.")
T(['change freeze','freeze period','no change period','blackout dates','change blackout','freeze window'],
  "During a change freeze, only emergency changes are permitted, typically around peak business periods or year-end. Plan non-urgent changes before or after the freeze. Check the change calendar for current blackout dates and seek an exception only for genuine emergencies.")
T(['change conflict','change clash','overlapping changes','scheduling conflict','conflicting change'],
  "Conflict detection flags changes that overlap on the same configuration items or windows. Review flagged conflicts before scheduling, coordinate with the other change owner, and adjust your window if needed. The change calendar helps you find a clear slot.")
T(['change task','child task','change sub-task','change tasks','break down change'],
  "Large changes are broken into change tasks so work can be assigned and tracked in sequence. Create tasks for pre-implementation, implementation, validation, and review, assign each to the right team, and order them so dependencies complete first.")
T(['post implementation review','change pir','change review','did it work','change closure review'],
  "After a change, the Post-Implementation Review confirms whether it met its objective, stayed within the window, and caused no issues. Record the outcome, any deviations, and lessons learned before closing the change. Failed or partially successful changes should capture follow-up actions.")
T(['change state','change lifecycle','approve change','implement change','close change','change workflow'],
  "A change moves through New, Assess, Authorize, Scheduled, Implement, Review, and Closed. It is assessed for risk, authorised by the CAB, scheduled into a window, implemented, reviewed for success, and then closed. Each stage gates the next to keep changes controlled.")
T(['change model','change template','pre-approved change','standard change template','reusable change'],
  "Change models and templates pre-define the steps, risk, and approvals for routine changes so you do not start from scratch. Standard changes use pre-approved models to skip the CAB. Select an existing model when your work matches a known, repeatable pattern.")
T(['cab meeting','change board meeting','cab schedule','when is cab','cab agenda'],
  "CAB usually meets on a regular cadence, often weekly, to review upcoming normal changes. Submit your change with a complete plan before the cut-off so it makes the agenda. Be ready to present the impact, risk, window, and back-out plan if asked.")
T(['rfc','request for change','rfc process','what is rfc','raise an rfc'],
  "RFC stands for Request For Change, the formal record proposing a change to a service or infrastructure. It captures the what, why, when, risk, and plans, and it is the basis for assessment and approval. In this platform, the Change Request record is your RFC.")
T(['change scope','affected cis','configuration items in change','change scope definition','what is affected'],
  "Define a change scope by listing the affected configuration items (CIs) on the change record. Accurate CI links power conflict detection, impact analysis, and notifications. Use the CMDB to identify dependencies so you capture everything the change could touch.")
T(['change testing','test plan','uat','change validation','test the change','validate change'],
  "Changes should include a test or validation plan describing how you will confirm success, ideally with user acceptance testing (UAT) where users verify the outcome. Define pass and fail criteria up front, and include the validation steps in your implementation plan.")
T(['change notification','inform stakeholders of change','change comms','notify affected parties','change announcement'],
  "Notify affected users and stakeholders before a change, especially if there is downtime, and again after completion. Use the change record to identify affected CIs and their owners, and send a clear message covering what is changing, when, and the expected impact.")
T(['change calendar','forward schedule of change','fsc','view change calendar','upcoming changes'],
  "The change calendar, also called the Forward Schedule of Change (FSC), shows all planned changes and their windows. Use it to find a clear slot, avoid conflicts and freezes, and see what else is happening around your proposed time before you schedule.")
T(['normal change process','full change lifecycle','complete change process','end to end change'],
  "A normal change runs: create the RFC with plans and risk, assess and authorise through the CAB, schedule into an approved window, implement using change tasks, validate the outcome, complete the post-implementation review, and close. Each step keeps the change controlled and auditable.")

# ============ PROBLEM MANAGEMENT ============
T(['create problem','raise problem','problem record','log problem','new problem','open a problem'],
  "To create a Problem record, use the Problem catalog item or create one from a recurring incident. Capture the symptom, the affected service, linked incidents, and an initial hypothesis. The Problem then drives root-cause analysis and a permanent fix.")
T(['root cause analysis','rca','five whys','fishbone','causal analysis','find root cause'],
  "Root-cause analysis identifies why an issue occurred so it does not recur. Common techniques include the Five Whys (repeatedly asking why) and the Fishbone (Ishikawa) diagram for categorising causes. Document the analysis on the Problem record and validate the cause before committing to a fix.")
T(['workaround','temporary fix','interim solution','work around','stopgap','temporary solution'],
  "A workaround restores service temporarily while the root cause is fixed. Document the workaround on the Problem and the Known Error so the service desk can apply it to related incidents immediately, reducing impact while the permanent fix is developed.")
T(['known error','known error database','kedb','register known error','knownerror'],
  "A Known Error is a problem with a documented root cause and workaround, stored in the Known Error Database (KEDB). Recording known errors lets agents resolve matching incidents quickly using the proven workaround until the permanent fix is deployed.")
T(['link incident to problem','incidents under problem','associate incidents','attach incidents to problem'],
  "Link incidents to a Problem from either record so all symptoms of the same root cause are grouped. This shows the true scale of impact and lets the permanent fix resolve the linked incidents together. Use the related list on the Problem to add or review incidents.")
T(['problem states','problem lifecycle','problem status','problem workflow','problem stages'],
  "Problem states are New, Assess, Root Cause Analysis, Fix in Progress, Resolved, and Closed. The problem is triaged, investigated for root cause, a fix is built and applied, then it is resolved and closed once the fix is confirmed effective.")
T(['permanent fix','problem resolution','fix problem','permanent solution','solve the problem'],
  "A permanent fix eliminates the root cause so the issue cannot recur. It often requires a Change Request to implement safely. Record the fix on the Problem, link the change, validate that linked incidents stop recurring, then resolve and close the Problem.")
T(['problem review','problem post mortem','review the problem','problem retrospective'],
  "After resolving a problem, review whether the fix worked, the time to resolve, and any process improvements. Capture lessons learned and preventive actions. This closes the loop and feeds continual improvement so similar problems are caught earlier next time.")
T(['recurring incident','repeating issue','same incident again','keeps happening','repeated incident'],
  "When the same incident recurs, raise a Problem to investigate the root cause rather than repeatedly resolving symptoms. Link the recurring incidents to the Problem so the permanent fix addresses them all and prevents future occurrences.")
T(['problem priority','problem severity','set problem priority','how urgent is problem'],
  "Problem priority reflects the impact and frequency of the underlying issue and the value of fixing it. High-impact, frequently recurring problems take priority. Set impact and urgency on the Problem so it is ranked appropriately against other investigations.")
T(['problem task','problem child task','problem work task','tasks on problem'],
  "Problem tasks break the investigation and fix into assignable units, such as gather logs, reproduce the issue, or test the fix. Create tasks on the Problem, assign them to the right specialists, and track them to keep the analysis moving forward.")
T(['problem metrics','problem kpis','open problems','problem backlog','problem reporting'],
  "Useful problem metrics include open problem count, age of the backlog, number of incidents prevented by fixes, and average time to root cause. Track these in Performance Analytics or build a report in the Studio section to monitor the health of problem management.")

# ============ KNOWLEDGE BASE USAGE ============
T(['search knowledge base','find article','kb search','look up article','knowledge article search','search the kb'],
  "Search the Knowledge Base at /sp?id=kb_home using specific terms from your issue. Try the exact error message or product name for the best matches. You can also ask me directly, for example \"How do I reset my password?\" and I will surface relevant articles.")
T(['create kb article','write article','new knowledge article','author kb','draft an article'],
  "To author a knowledge article, open the Knowledge Base, choose the right knowledge base and category, and create a new article with a clear title, summary, and steps. Submit it for review so it can be approved and published. Reuse a template for consistent structure.")
T(['publish article','approve article','kb workflow','submit for review','publish knowledge'],
  "Articles move through Draft, Review, and Published. After writing, submit for review; a knowledge manager or subject expert approves it, and it becomes Published and searchable. Some bases allow direct publishing for trusted authors depending on governance.")
T(['kb categories','knowledge bases','article category','knowledge base list','organize articles'],
  "Knowledge is organised into knowledge bases (by domain or team) and categories within them. Place each article in the most relevant base and category so users and search can find it. Browse the structure from /sp?id=kb_home.")
T(['article feedback','rate article','article not helpful','article wrong','article incorrect','flag article'],
  "Each article has feedback controls so you can mark it helpful or not and add comments. If an article is wrong or outdated, flag it so the owner can correct it. Your feedback improves article quality and search ranking for everyone.")
T(['kb article review','article expiry','review cycle','knowledge review','article validity'],
  "Articles have a review or expiry date so they stay accurate. When an article is due, its owner is prompted to verify and update or retire it. This review cycle keeps the knowledge base trustworthy and prevents stale guidance from circulating.")
T(['kb article template','article structure','article format','knowledge template','how to format article'],
  "Use the provided article templates for a consistent structure: a clear title, a short summary, prerequisites, numbered steps, and related links. Well-structured articles are easier to follow and rank better in search, so prefer concise, scannable content.")
T(['attach file to article','article attachments','image in kb','video in article','add media to article'],
  "You can attach files, images, and link videos to articles to clarify steps. Keep attachments relevant and reasonably sized, add descriptive captions, and prefer inline screenshots for procedures. Ensure any media follows your data classification rules before attaching.")
T(['article versioning','update article','revise article','article version history','edit published article'],
  "Editing a published article typically creates a new version while preserving history, so you can see what changed and revert if needed. Update the content, note the change, and resubmit for review if your governance requires approval before the new version publishes.")
T(['kb metrics','article views','popular articles','kb analytics','knowledge usage'],
  "Knowledge analytics show article views, search hits, helpfulness ratings, and incidents deflected. Use these to find your most valuable articles and gaps where new content is needed. View them in Performance Analytics or a Studio report.")
T(['retire article','deactivate article','remove old article','archive article','unpublish article'],
  "To retire an outdated article, set it to Retired or Archived rather than deleting it, so its history is preserved and links do not break. The article stops appearing in search. Replace it with current guidance and point users to the new article where relevant.")
T(['kb access','who can read kb','kb permissions','restricted articles','knowledge access control'],
  "Article visibility is controlled by the knowledge base and user criteria, so some content is restricted to specific roles, groups, or departments. If you cannot see an article you need, contact the knowledge base owner to confirm your access or request it.")
T(['related articles','suggested articles','kb recommendations','similar articles','linked articles'],
  "Articles can link to related content, and search and the portal suggest similar articles based on your query. Add related links when authoring to guide readers to next steps. When searching, scan the suggested articles for a faster answer.")
T(['translate article','multilingual kb','language support','article translation','localized knowledge'],
  "Knowledge can be authored in multiple languages, with translated versions linked to the source article. Users see content in their preferred language where a translation exists. If you need an article in another language, request a translation from the knowledge owner.")
T(['subscribe to article','article notifications','follow article','watch article','article updates'],
  "You can follow or subscribe to an article to be notified when it changes. This is useful for procedures you rely on. Look for the follow or subscribe control on the article, and manage your subscriptions from your notification preferences.")

# ============ SLA MANAGEMENT ============
T(['sla definition','what is sla','service level agreement','sla explained','define sla'],
  "A Service Level Agreement (SLA) is a commitment on how quickly a service responds to and resolves work, measured against targets. It defines the metric, the target time, the schedule it runs on, and the conditions that start, pause, and stop the timer.")
T(['sla target','response time target','resolution time target','sla times','how long to resolve','target times'],
  "Typical SLA targets by priority:\n- P1 Critical: ~1 hour response, ~4 hour resolution\n- P2 High: ~4 hour response, ~8 hour resolution\n- P3 Moderate: ~8 hour response, ~3 day resolution\n- P4 Low: ~1 day response, ~5 day resolution\nActual targets follow your organisation's SLA definitions.")
T(['pause sla','sla on hold','sla paused','stop sla clock','hold the sla'],
  "An SLA timer pauses when the record enters a defined pause state, such as On Hold awaiting the caller or a vendor. This stops the clock so time spent waiting on others is not counted against you. Use the correct on-hold reason to trigger the pause.")
T(['resume sla','restart sla','continue sla','sla resumes','unpause sla'],
  "When a record leaves its pause state, for example moving from On Hold back to In Progress, the SLA timer resumes from where it stopped. Ensure you move the record out of the pause state promptly once you can act again so the clock reflects active work.")
T(['ola','operational level agreement','underpinning contract','internal agreement','ola vs sla'],
  "An Operational Level Agreement (OLA) is an internal commitment between teams that supports an SLA, while an Underpinning Contract (UC) is a similar commitment with an external supplier. SLAs face the customer; OLAs and UCs make sure internal and vendor support can meet them.")
T(['business hours','sla business time','working hours','sla calendar','holiday schedule','sla schedule'],
  "SLAs run against a schedule, often business hours rather than around the clock, and they respect defined holidays. This means a target measured in business hours pauses overnight and on non-working days, so a same-day target may complete the next morning.")
T(['sla escalation','sla notify manager','sla escalation rule','escalate on breach','sla alerts'],
  "As an SLA approaches or passes its target, escalation rules notify the assignee, the assignment group, and management so action is taken. Respond to early-warning notifications to avoid breaches, and add notes documenting any legitimate reasons for delay.")
T(['sla metrics','sla compliance','sla report','sla performance','sla dashboard','sla achievement'],
  "SLA compliance is the percentage of records that met their targets over a period. Track it by priority, team, and service in Performance Analytics or a Studio report. Trends in compliance highlight where capacity, process, or workarounds need attention.")
T(['sla retroactive','retroactive breach','adjust sla','sla correction','fix sla'],
  "If an SLA was attached late or mis-set, it can sometimes be corrected so reporting reflects reality, subject to your governance. Document the reason for any adjustment. For systemic issues, review the SLA definition and conditions rather than adjusting records individually.")
T(['custom sla','create sla','new service level','sla record','define new sla'],
  "Creating an SLA definition requires admin configuration: define the table and conditions, the start, pause, and stop criteria, the target duration, and the schedule. Test it against sample records before enabling it broadly so it measures exactly the work you intend.")

# ============ CMDB & ASSET MANAGEMENT ============
T(['what is cmdb','configuration management database','cmdb explained','define cmdb','cmdb overview'],
  "The Configuration Management Database (CMDB) is the trusted record of your IT assets, called Configuration Items (CIs), and the relationships between them. It underpins impact analysis, change conflict detection, and service mapping so you can see what depends on what.")
T(['configuration item','what is a ci','cmdb record','ci explained','define ci'],
  "A Configuration Item (CI) is any component tracked in the CMDB, such as a server, application, network device, database, or business service. Each CI has attributes and relationships. Accurate CIs let you assess the impact of incidents and changes precisely.")
T(['ci classes','cmdb classes','types of ci','ci types','configuration item classes'],
  "CIs are grouped into classes such as Hardware (servers, laptops, network gear), Software (applications, databases), and Services (business and technical services). Each class has its own attributes. Classing CIs correctly improves discovery, reporting, and mapping.")
T(['ci relationships','dependency','runs on','hosted on','depends on','ci relationship types'],
  "CI relationships describe dependencies, for example an application Runs On a server, which is Hosted On a hypervisor. These links power impact analysis, so a change or outage on one CI shows everything affected downstream. Keep relationships current for accurate analysis.")
T(['discovery','auto-discovery','cmdb discovery','discovered cis','automatic discovery'],
  "Discovery automatically finds devices and software on the network and populates or updates the CMDB, reducing manual effort and keeping data current. Discovered CIs include attributes and relationships. Coverage gaps usually mean a credential, range, or probe needs attention.")
T(['add ci','create ci','new configuration item','register asset','manually add ci'],
  "When discovery does not cover an item, create the CI manually: choose the correct class, fill in key attributes, and add relationships to related CIs. Manual CIs should still follow naming and data standards so they integrate cleanly with discovered data.")
T(['hardware asset','physical asset','equipment','laptop asset','server asset','hardware lifecycle'],
  "Hardware assets are tracked through their lifecycle: ordered, received, in stock, in use, in repair, and retired. Each asset links to a CI and often to an owner and location. Keep status and assignment current so audits and refresh planning are accurate.")
T(['software asset','license','sam','software license management','software licensing','license compliance'],
  "Software Asset Management (SAM) tracks licences, installations, and entitlements to keep you compliant and control cost. It compares what is installed against what is licensed to flag over- or under-use. Report unused licences for reclaim and ensure renewals are planned.")
T(['procurement','purchase order','buy new equipment','asset procurement','order hardware','purchase request'],
  "Procurement turns an approved request into a purchase order, receipt, and an asset record in the CMDB. Start from the catalog request for the item; once approved, fulfilment handles ordering and receiving, and the new asset is registered and assigned to you.")
T(['decommission','retire asset','end of life','dispose asset','retire ci','asset disposal'],
  "Decommissioning retires an asset and its CI: confirm it is no longer in use, remove or update dependent relationships, securely wipe or dispose of the hardware, and set the CI and asset status to Retired. This keeps the CMDB clean and supports secure disposal records.")
T(['cmdb health','stale cis','duplicate cis','orphaned records','cmdb data quality','cmdb cleanup'],
  "CMDB health dashboards flag stale CIs (not updated by discovery), duplicates, and orphans with no relationships. Regularly review and remediate these to keep impact analysis trustworthy. Strong discovery coverage and clear ownership are the best defences against drift.")
T(['ci attributes','ci fields','cmdb fields','asset fields','configuration item attributes'],
  "Key CI attributes include name, class, status, owner, support group, location, and class-specific details like serial number or version. Complete attributes power assignment, reporting, and impact analysis, so keep at least the core fields populated and accurate.")
T(['service mapping','application mapping','business service','map a service','service map'],
  "Service mapping discovers and maps the CIs that make up a business service and how they connect, giving you a top-down view from service to infrastructure. This shows exactly what a service depends on, so incidents and changes can be assessed by business impact.")
T(['infrastructure topology','dependency views','relationship map','topology view','dependency map'],
  "The dependency views and topology maps visualise CI relationships so you can trace upstream and downstream impact. Open a CI and view its map to see what it depends on and what depends on it before you make a change or while diagnosing an outage.")
T(['affected ci','incident affected ci','change affected ci','link ci to ticket','ci on ticket'],
  "Linking the affected CI on an incident or change connects the work to the asset, enabling impact analysis, conflict detection, and better reporting. Set the Configuration Item field on the ticket, and add additional affected CIs where the work touches more than one.")
T(['software installation','install software','application deployment','track installs','software deployment'],
  "Software installations are tracked as relationships between software CIs and the devices they run on, often populated by discovery. This shows where an application is deployed for licensing, patching, and impact analysis. Request new installs through the Service Catalog.")
T(['certificate','ssl certificate','certificate management','cert tracking','tls certificate','certificate expiry'],
  "Certificates can be tracked in the CMDB with their expiry dates so you are alerted before they lapse and cause outages. Maintain owners and renewal reminders for each certificate. Treat an expiring certificate as a change to renew it within a controlled window.")
T(['network device','network ci','switch','router','firewall','network equipment'],
  "Network devices such as switches, routers, and firewalls are CIs with relationships to the systems and segments they serve. Discovery typically populates them. Their relationships are vital for tracing connectivity issues and assessing the blast radius of network changes.")
T(['virtual machine','cloud instance','vm management','virtualization','virtual server','vm ci'],
  "Virtual machines and cloud instances are CIs related to their host or cloud account, so you can map workloads to underlying capacity. Discovery and cloud integrations keep them current. Track VMs to manage sprawl, plan capacity, and assess change impact.")
T(['asset tag','barcode','asset label','physical label','tag asset','asset identifier'],
  "Asset tags or barcodes uniquely identify physical assets and link them to their CMDB records, making audits and check-in or check-out fast and reliable. Ensure every tracked device carries its tag, and scan it to update status, location, or assignment.")

# ============ USER & ACCOUNT MANAGEMENT ============
T(['create user','new user account','add user','onboard user','user account creation','provision user'],
  "Creating a user is usually an admin or HR-integrated task: capture name, email, department, manager, and the roles or groups required. Where identity is synced from Active Directory, accounts provision automatically. For a new starter, use the onboarding request to provision access.")
T(['deactivate user','remove user','offboard user','delete account','disable user','terminate access'],
  "To offboard a user, deactivate the account rather than deleting it, so history is preserved, then remove roles and group memberships and reclaim assets and licences. Where identity is synced, disabling the source account propagates. Use the offboarding request to coordinate this.")
T(['reset password','forgot password','password reset help','unlock account','locked out','cannot log in'],
  "For password help:\n1. Use self-service reset at /sp?id=self_service_pw_reset\n2. If locked out, wait briefly and retry, or contact IT Support\n3. For your network password, use the company self-service portal\nRaise an \"Account Access\" request in the catalog if you need agent assistance.")
T(['assign role','give role','user role','role assignment','grant permission','add a role'],
  "Roles grant access to features and data. An admin assigns roles directly on the user, or you receive them through group membership. To request a role, raise an access request in the catalog with a business justification; sensitive roles route for approval before they are granted.")
T(['group membership','add to group','join group','remove from group','group member','manage group'],
  "Group membership often grants roles and routes work and approvals. To join a group, request it through the catalog or ask the group owner to add you. Removing membership withdraws the associated access, so review memberships during role changes and offboarding.")
T(['user profile','edit profile','update details','change display name','my profile details','update profile'],
  "Update your profile from your account settings to correct your display name, contact details, or photo. Some fields, like name and department, may be controlled by HR or identity sync and are read-only. For locked fields, raise a request to have them corrected.")
T(['delegation','out of office','delegate approvals','delegate tasks','set a delegate','cover for me'],
  "Delegation lets a colleague act on your approvals and tasks while you are away. Set a delegate with a start and end date in your profile or preferences, choosing what they can act on. Remember to remove or expire the delegation when you return.")
T(['impersonation','impersonate user','act as','switch user','impersonate','view as user'],
  "Impersonation lets an admin experience the platform exactly as another user to troubleshoot access and visibility. It is an administrative, audited action available from the user menu for authorised admins only. Use it to reproduce a user's issue, then stop impersonating.")
T(['user preferences','system preferences','settings','personalization','my settings','account preferences'],
  "Personal preferences such as theme, list density, and default views live in your settings, reachable from your profile menu. Adjusting them tailors the platform to how you work without affecting anyone else. Some preferences also sync across the portal and the agent interface.")
T(['notification preferences','email settings','opt out','unsubscribe','notification bell','manage notifications'],
  "Manage how you are notified from Notification Preferences in your profile. You can choose channels like email or mobile push, and opt in or out of specific notifications where allowed. Critical operational notifications may be mandatory and cannot be disabled.")
T(['timezone','locale','language','region setting','date format','change language'],
  "Set your time zone, language, and date format in your preferences so times and dates display correctly for you. These settings affect how schedules and SLAs appear on your screen. If an option is missing, contact your administrator to enable the locale.")
T(['multi-factor authentication','mfa','two factor','2fa','authenticator app','enable mfa'],
  "Multi-Factor Authentication (MFA) adds a second verification step at login, usually a code from an authenticator app or a push approval. Enrol from your security settings or during sign-in when prompted. Keep a backup method in case your primary device is unavailable.")
T(['single sign-on','sso','saml','login with company account','company login','federated login'],
  "Single Sign-On (SSO) lets you log in with your company identity instead of a separate password, using a standard like SAML. When SSO is enabled, choose the company login option and authenticate once. If SSO fails, your account or identity provider may need attention.")
T(['active directory','ldap','sync user','identity provider','ad sync','directory sync'],
  "Active Directory or LDAP integration synchronises user accounts and attributes into the platform, so changes in the directory flow through automatically. This keeps profiles current and supports SSO. If your details are wrong, the fix usually starts in the source directory.")
T(['user type','service account','admin account','guest user','account type','types of accounts'],
  "Account types include standard users, service accounts for integrations and automation, administrative accounts with elevated rights, and limited guest accounts. Each is scoped to its purpose. Service and admin accounts are governed tightly, with restricted use and auditing.")
T(['license count','user licenses','active users','user count','licensing','seat usage'],
  "Licensing is usually based on active users or feature subscriptions. Admins can report on active accounts and feature usage to manage seats and plan renewals. Deactivating leavers and reclaiming unused access keeps licence consumption efficient.")

# ============ APPROVALS ============
T(['approve request','reject request','approve item','approval action','how to approve','approve or reject'],
  "To act on an approval, say \"Show my approvals\" here or open /sp?id=approvals, then review the details and choose Approve or Reject. Add a comment, especially when rejecting, so the requester understands the decision. Your action moves the request to its next step.")
T(['approval notification','approval email','got approval request','approval request received','notified to approve'],
  "When something needs your approval you receive a notification by email and in the portal with a link to act. Open the approval to see the request, the requester, and any justification before deciding. You can also find all pending approvals at /sp?id=approvals.")
T(['approval chain','multi-level approval','sequential approval','parallel approval','approval levels'],
  "Approvals can be sequential, where each approver acts in turn, or parallel, where several approve at once. Multi-level chains add approvers for higher value or risk. You can see the full chain and your position in it on the request's approval history.")
T(['approval on behalf','delegate approval','out of office approval','approve for someone','delegated approval'],
  "If a colleague delegates their approvals to you, their pending approvals appear in your queue for the delegation period. Act on them as you would your own, with a clear comment. Delegators set this in their preferences with a start and end date.")
T(['bulk approve','approve multiple','mass approval','approve all','batch approve'],
  "When you have many similar approvals, you can select multiple in the approvals list and approve them together where the interface allows. Still review each one's substance, and reserve bulk approval for low-risk, well-understood requests to keep control.")
T(['approval history','who approved','approval trail','approval audit','approval record'],
  "Every request keeps an approval history showing each approver, their decision, the timestamp, and any comments. Open the request and view the Approvers related list or activity stream to see the full trail, which is the authoritative audit record of the decision.")
T(['approval reminder','re-notify approver','remind approver','chase approval','approval nudge'],
  "If an approval is overdue, you can send a reminder to the approver, or escalation rules may re-notify them automatically. From the request, use the reminder action where available, or contact the approver directly for time-sensitive items.")
T(['approval escalation','approval timeout','auto approve','approval deadline reached','escalate approval'],
  "Approvals can escalate or, in some configurations, auto-approve or reject after a timeout to prevent stalls. Reminders fire as the deadline nears. Review the request's policy to understand its timeout behaviour, and act promptly to keep control of the decision.")
T(['approval group','group approval','any member approves','team approval','group based approval'],
  "Group approvals send the request to a group where any member can approve on the group's behalf, so absence of one person does not block progress. The approval shows who acted for the group. This is ideal for shared accountability across a team.")
T(['reject with comments','rejection reason','why rejected approval','document rejection','reason for rejection'],
  "When rejecting, always add a clear comment explaining why and what the requester can change. This turns a rejection into useful feedback and reduces back-and-forth. The requester sees your comment on the request and can address it before resubmitting.")
T(['resubmit after rejection','fix and resubmit','resubmit request','try again after rejection'],
  "If your request was rejected, read the approver's comments, address the issue, and submit a new request that resolves their concern. Reference the original request if helpful. A clear, complete resubmission is far more likely to be approved quickly.")
T(['approval sla','time to approve','approval deadline','approval target','how long to approve'],
  "Some approvals have target times so requests do not stall. Approvers receive reminders as the deadline approaches, and overdue approvals may escalate. As an approver, act promptly; as a requester, you can check the approval's progress on your request page.")
T(['approval rules','approval policy','when is approval needed','approval conditions','approval requirement'],
  "Whether approval is required depends on rules tied to the item, its value, risk, or the access requested. Low-risk items may need no approval, while sensitive access routes to managers and owners. You can see required approvals on a catalog item before you submit it.")

# ============ NOTIFICATIONS ============
T(['email notification','send notification','email alert','automated email','system email','how notifications work'],
  "The platform sends notifications by email and in-portal when relevant events occur, such as an assignment, an approval request, or a status change. Notifications include a link to the record so you can act quickly. Manage which ones you receive in your notification preferences.")
T(['turn off emails','mute notification','reduce emails','stop notifications','too many emails','disable notifications'],
  "To reduce email, open Notification Preferences in your profile and opt out of the non-essential notifications you no longer need. You can often switch some to in-portal or mobile only. Note that critical operational notices may be mandatory and cannot be turned off.")
T(['missed notification','not receiving emails','email not sent','notification missing','no notifications','not getting emails'],
  "If you are missing notifications, check your notification preferences and spam folder, confirm your email address is correct on your profile, and verify you have not opted out. If everything looks right and emails still fail, raise an incident so IT can check delivery.")
T(['push notification','mobile notification','app notification','phone notification','enable push'],
  "Mobile push notifications alert you on your phone for approvals, assignments, and updates through the mobile app. Enable them in the app settings and your notification preferences, and ensure your device allows notifications for the app at the operating-system level.")
T(['sms notification','text notification','text message alert','sms alerts','receive sms'],
  "Where enabled, SMS notifications send time-critical alerts by text, useful for on-call and major incidents. Confirm your mobile number is correct on your profile and that SMS is permitted for the relevant notifications. SMS is typically reserved for high-priority events.")
T(['notification template','email template','customize notification','edit notification','notification content'],
  "Notification content comes from templates that an admin configures, defining the subject, body, and recipients with dynamic fields from the record. To change wording or recipients, an administrator edits the template. Request changes through your platform admin.")
T(['notification log','email log','notification history','sent emails','check email log','outbound log'],
  "Administrators can review the notification or email log to confirm whether a message was generated and sent, and to diagnose delivery issues. If you suspect a missing notification, an admin can check the log for your record to see exactly what happened.")
T(['watchlist','watch','follow record','add to watch list','subscribe to record','watch this ticket'],
  "Add yourself to a record's watch list to receive updates even if you are not the assignee, for example to follow a major incident or a request you care about. Use the watch-list control on the record, and remove yourself when you no longer need updates.")
T(['notification trigger','when notification sends','notification condition','notification event','what triggers notification'],
  "Notifications fire on defined triggers, such as a record being inserted, a field changing, or a specific event being raised, filtered by conditions. This controls exactly who is told and when. Administrators configure these triggers and conditions per notification.")
T(['outbound email','email integration','smtp','email server','outbound mail','send mail config'],
  "Outbound email delivers notifications through the platform's mail configuration to your mail server. If outbound email fails platform-wide, notifications stop, so this is an admin-monitored service. Suspected delivery problems should be raised as an incident for investigation.")
T(['inbound email','email to ticket','create from email','email action','reply by email','inbound mail'],
  "Inbound email can create or update records, for example turning an email into an incident or adding your reply as a comment when you respond to a notification. Reply above the marker line so your text is captured. Configuration of inbound actions is an admin task.")
T(['notification rule','notification event registration','event trigger','register notification','event based notification'],
  "Event-based notifications rely on registered events that the platform raises during processing; a notification then listens for that event and sends to the right recipients. This decouples the trigger from the message. Admins register events and bind notifications to them.")

# ============ REPORTS & ANALYTICS ============
T(['create report','build a report','new report','report builder','make a report','design a report'],
  "To build a report, open the report designer, choose the source table, pick a type such as list or bar chart, set your filter conditions, and select the fields or grouping to display. Save it and share it with the right audience. In this portal, Creators build reports from the Studio section.")
T(['report types','list report','bar chart','pie chart','time series','report visualization','chart types'],
  "Common report types include List for detailed rows, Bar and Column for comparisons, Pie for proportions, Trend and Time Series for change over time, and Pivot for cross-tabulation. Choose the type that best answers your question and reads clearly at a glance.")
T(['report conditions','filter report','report query','report criteria','report filter','narrow report'],
  "Use conditions to focus a report on the rows you care about, for example active incidents assigned to your group this month. Combine filters with AND and OR, and prefer indexed fields for speed. Save common filters so you can reuse them across reports.")
T(['run report','view report','execute report','generate report','open report','show report'],
  "To run a report, open it from the report list or a dashboard and it generates against live data. You can adjust the filter at run time where allowed. For heavy reports, schedule them to run off-peak so interactive performance stays fast.")
T(['schedule report','automated report','report subscription','send report','email report','recurring report'],
  "Schedule a report to run and be emailed on a cadence, such as a weekly summary to your team. Set the frequency, the format, and the recipients. Scheduled delivery keeps stakeholders informed without anyone manually running and sending the report.")
T(['share report','export report','download report','report pdf','excel export','export data'],
  "Share a report by granting access to users or groups, or export it to PDF, Excel, or CSV for offline use. Respect data handling rules when exporting sensitive data. For recurring sharing, a scheduled subscription is usually better than manual exports.")
T(['performance analytics','pa','pa widget','pa dashboard','analytics platform','performance analytics overview'],
  "Performance Analytics (PA) tracks indicators over time using daily snapshots, so you can see trends, targets, and forecasts rather than just a current snapshot. PA powers scorecards and dashboards. Use it when you need historical trends and KPI management, not just point-in-time reports.")
T(['kpi','indicator','scorecard','target','performance indicator','define kpi'],
  "A KPI or indicator is a measured value tracked against a target over time, such as SLA compliance or backlog size. Scorecards drill into an indicator's breakdowns and trend. Define indicators with clear targets so progress is visible and improvement is measurable.")
T(['dashboard','dashboard overview','create dashboard','add widget to dashboard','build dashboard','dashboard layout'],
  "Dashboards combine reports, indicators, and widgets on one screen for an at-a-glance view. Create a dashboard, add and arrange widgets, and share it with the relevant audience. In this portal, Creators build dashboards from the Studio section and they appear in the Gallery.")
T(['report permissions','who can see report','restrict report','share with group','report visibility','report access'],
  "Control who sees a report by sharing it with specific users or groups, or publishing it more broadly. Restrict reports that contain sensitive data to the appropriate audience. Always check sharing settings before distributing so the right people, and only them, have access.")
T(['report list','my reports','all reports','report repository','find a report','report catalog'],
  "Find existing reports in the report list, filtered by those you own, those shared with you, and all reports you can access. Search by title or table to avoid rebuilding something that already exists. Reuse and adapt an existing report where you can.")
T(['report template','save report','report configuration','reuse report','clone report'],
  "Save your report configuration so you can reuse or clone it as a starting point for similar reports, changing only the filter or grouping. This keeps formatting consistent and saves time. Build a small set of trusted templates for your team's common needs.")
T(['chart configuration','chart color','axis label','legend','chart formatting','style chart'],
  "Tune a chart with clear axis labels, a sensible legend, and colours that distinguish series without overwhelming the reader. Avoid clutter, label units, and keep the title descriptive. A well-formatted chart communicates the insight in seconds.")
T(['pivot table','matrix report','cross tab','crosstab','pivot report','two dimensional report'],
  "A pivot or matrix report cross-tabulates two dimensions, for example incidents by priority across assignment groups, with counts or sums in the cells. It is ideal for spotting concentrations and gaps. Choose row and column groupings that make the pattern obvious.")
T(['report drill down','interactive report','click through','drill into report','drilldown'],
  "Interactive reports let you click a bar, slice, or cell to drill into the underlying records. This turns a high-level chart into an investigation tool. Enable drill-down so users can move from the trend to the specific records driving it without building extra reports.")
T(['ad hoc report','quick report','one-off report','fast report','temporary report'],
  "For a quick answer, build an ad-hoc report directly from a list: apply a filter, group it, and visualise the result without saving a permanent report. This is perfect for one-off questions. Save it only if you will need the same view again.")
T(['report audit','who ran report','report usage','analytics on reports','report statistics'],
  "Usage data shows which reports are run, how often, and by whom, helping you retire unused reports and promote the valuable ones. Administrators can review this to keep the report catalog lean and ensure popular content stays accurate and performant.")

# ============ PLATFORM NAVIGATION ============
T(['application navigator','left nav','navigation menu','app navigator','navigate the platform','main menu'],
  "The application navigator on the left lists all modules you can access, grouped by application. Use the filter box at the top to jump straight to a module by name. In this Operations Intelligence portal, use the sidebar to move between Workspace, Gallery, Studio, Governance, and Command.")
T(['favorites','favorite module','pin module','add to favorites','favorite list','bookmark module'],
  "Mark modules and records as favourites so you can reach them in one click. Use the star or pin control next to an item, then find them under your favourites list. Curate your favourites around your daily tasks to cut down on searching.")
T(['recent records','recently viewed','history drawer','view history','recent items','recently opened'],
  "Your history keeps the records you recently opened so you can jump back without searching. Open the history list to revisit recent work. This is handy when you move between several tickets and want to return to one you just had open.")
T(['global search','unified search','search bar','quick search','search everything','platform search'],
  "Global search looks across records and knowledge from one bar. Use specific terms, exact numbers like an incident number, or a phrase in quotes for precision. In the portal, the search and this Assistant both help you find requests, incidents, and articles fast.")
T(['lists and forms','list view','form view','record view','view a record','list vs form'],
  "A list view shows many records as rows for scanning and filtering, while a form view shows one record in detail for reading and editing. Open a row to move from the list to the form. Use lists to find and triage, forms to work an individual item.")
T(['filter list','search list','refine results','list filter','filter records','condition builder'],
  "Refine a list with the filter or condition builder: pick a field, an operator, and a value, and combine conditions with AND and OR. Save filters you use often. A precise filter turns a long list into exactly the records you need to act on.")
T(['column chooser','show hide columns','display fields','customize columns','add column','arrange columns'],
  "Personalise list columns to show the fields that matter to you using the column chooser, then reorder them by preference. This tailors the list to your workflow without affecting other users. Keep the most decision-relevant fields toward the left.")
T(['personalize form','add field to form','customize form view','rearrange form','form layout','edit form'],
  "Where permitted, personalise a form to surface the fields you use most and hide clutter, improving your speed on repetitive work. Personalisation affects only your view. For changes everyone should see, request a configuration change from an administrator instead.")
T(['reference field','lookup field','type ahead','suggestion field','reference lookup','autocomplete field'],
  "A reference field links to another record, like Assigned To pointing at a user. Start typing to see matching suggestions, or use the lookup icon to search. Pick the correct record so relationships, routing, and reporting stay accurate.")
T(['related list','related items','child records','associated records','related records','related tab'],
  "Related lists at the bottom of a form show connected records, such as the tasks, approvals, or affected CIs for a ticket. Use them to see and manage everything attached to the record in one place, and to add or remove related items.")
T(['ui actions','context menu','right click menu','form buttons','header actions','record actions'],
  "Buttons at the top of a form and options in the right-click context menu are UI actions that perform tasks like resolving, assigning, or exporting. The available actions depend on the record and your access. Hover or explore the menu to discover what you can do.")
T(['tagging','tag record','categorize record','label record','add tag','record tags'],
  "Tags are personal or shared labels you attach to records to group and find them, independent of the record's own fields. Tag related items with a common label, then filter by that tag to pull them together quickly across lists.")
T(['saved searches','condition bookmark','save a filter','saved filter','bookmark search','reuse search'],
  "Bookmark a filtered list to save a search you run regularly, then reach that exact view in one click from your bookmarks. This is faster than rebuilding the filter each time and keeps your common working sets at your fingertips.")
T(['keyboard shortcuts','hot keys','shortcut keys','keyboard navigation shortcut','shortcuts list','quick keys'],
  "Keyboard shortcuts speed up navigation and form actions, such as saving a record or jumping to search, without reaching for the mouse. Check the platform's shortcut reference for the current list. Learning a few high-use shortcuts noticeably improves your speed.")
T(['dark mode','ui theme','light dark toggle','change theme','theme switching','color theme'],
  "Switch between light and dark themes from your preferences or the theme toggle to suit your environment and reduce eye strain. The choice applies to your view only. If a theme option is missing, your administrator may need to enable it.")
T(['accessibility','screen reader','high contrast','keyboard only','508','accessible navigation'],
  "The platform supports accessibility features including screen-reader compatibility, keyboard-only navigation, and high-contrast options to meet standards such as Section 508 and WCAG. Enable the options you need in your preferences, and raise an incident if you hit a barrier so it can be addressed.")
T(['open in new tab','separate window','new browser tab','open record new tab','duplicate tab'],
  "You can open many records and lists in a new tab to keep your current context while you look at something else, using your browser's open-in-new-tab action on a link. This is useful when comparing records or referencing one while editing another.")
T(['bulk edit','edit multiple','mass update','multi-row edit','update many records','bulk update'],
  "To update many records at once, select them in a list and use the bulk edit action to set a field across all of them, or use list-edit to change values inline. Take care with mass updates, double-check your selection and the value before applying.")
T(['print record','print list','pdf print','print a form','export to print','printable view'],
  "Use the print or export action to produce a clean copy of a record or list, often as a PDF, for sharing or filing. Choose a printable view where offered so the output omits navigation chrome. Mind data handling rules before printing sensitive records.")
T(['system settings','sys admin settings','platform settings','admin settings','global settings location'],
  "Administrative and system settings live in dedicated admin modules and system properties, available only to users with the right roles. General users adjust personal options in preferences instead. To change a platform-wide setting, request it from an administrator with a clear reason.")

# ============ SERVICE PORTAL ============
T(['service portal','portal home','go to portal','sp home','open service portal','portal overview'],
  "The Service Portal is the user-friendly front door to services and support at /sp. From there you can browse the catalog, search knowledge, track requests, and reach support, all in a clean, responsive layout. Bookmark /sp for quick access.")
T(['portal navigation','portal menu','catalog portal nav','portal sections','navigate portal','portal links'],
  "Move around the portal using the top menu and homepage tiles, which lead to the catalog, knowledge, your requests, and support. The search bar spans everything. This Operations Intelligence portal adds a sidebar for Workspace, Gallery, Studio, Governance, and Command.")
T(['my account portal','profile in portal','portal profile page','account in portal','portal settings'],
  "Open your profile from the portal's user menu to view and update your details and preferences. From there you can manage notifications, language, and other personal settings. Some fields may be read-only if they are managed by HR or identity sync.")
T(['catalog in portal','browse catalog portal','service catalog portal','portal catalog','order in portal'],
  "Browse and order services from the portal catalog at /sp?id=sc_home. Search or browse categories, open an item to complete its form, and submit to receive a request number. Track everything you order from your requests page in the same portal.")
T(['kb in portal','knowledge portal','articles portal','search kb portal','portal knowledge'],
  "Find help articles in the portal knowledge base at /sp?id=kb_home. Search with specific terms or browse categories, rate articles as helpful, and follow ones you rely on. You can also ask me a how-to question and I will surface relevant articles.")
T(['request tracking portal','my requests portal','track requests portal','portal requests','view orders portal'],
  "Track everything you have ordered at /sp?id=requests, where each request shows its stage, items, approvals, and assigned fulfiller. Click an item for its full history. You can also say \"Show my requests\" here and I will list them for you.")
T(['virtual agent','chatbot','portal chat','va','chat assistant','conversational support'],
  "A Virtual Agent or chat assistant answers common questions and performs guided tasks in conversation, escalating to a person when needed. I am the Assistant for this Operations Intelligence portal; ask me about requests, incidents, approvals, knowledge, or automations any time.")
T(['portal widget','sp widget','customize portal','portal page widget','widget configuration','add widget portal'],
  "Portal widgets are the reusable building blocks that render content and behaviour on portal pages. Designers place and configure widgets to compose pages. Changing portal widgets and pages is an administrative or developer task; request changes through your platform team.")
T(['portal branding','portal theme','portal colors','portal logo','brand the portal','portal appearance'],
  "Portal branding, including the logo, colours, and theme, is configured centrally so the portal matches your organisation's identity. These are administrative settings. To propose a branding change, raise a request with your platform or communications team.")
T(['portal page','configure page','add page','sp page','create portal page','manage portal pages'],
  "Portal pages are composed of widgets on a responsive grid and managed by designers in the portal tooling. Adding or configuring pages is an administrative task. If you need a new page or section, request it from your platform team with the intended content and audience.")
T(['portal mobile','responsive portal','mobile sp','portal on phone','mobile portal experience'],
  "The Service Portal is responsive, so it adapts to phones and tablets and you can browse the catalog, track requests, and act on approvals on the go. For an app-like experience with push notifications, also try the dedicated mobile app.")
T(['portal performance','slow portal','portal load time','portal lagging','portal speed'],
  "If the portal is slow, try clearing your browser cache, checking your network, and disabling heavy browser extensions. Persistent slowness across users may indicate a platform issue, so raise an incident with the time, page, and your location so it can be investigated.")
T(['portal login','portal authentication','portal access','log into portal','portal sign in'],
  "Access the portal at /sp and sign in with your standard credentials or company SSO. If login fails, confirm your account is active and try a password reset or the SSO option. Repeated access problems should be raised with IT Support.")

# ============ MOBILE APP ============
T(['servicenow mobile','now mobile','mobile app','download app','get the mobile app','install app'],
  "The mobile app puts key tasks on your phone: act on approvals, view and update tickets, order from the catalog, and get push notifications. Install it from your device's app store and sign in with your company credentials or SSO to get started.")
T(['mobile features','what can i do on mobile','mobile capabilities','mobile functions','mobile app features'],
  "On mobile you can review and act on approvals, log and update incidents, browse and order catalog items, view your requests, and receive push notifications. It is designed for quick actions on the go, with the full portal available when you need more depth.")
T(['offline mode','mobile offline','work offline','no internet mobile','offline access'],
  "The mobile app supports limited offline use for certain actions, queuing your changes and syncing them when connectivity returns. Capabilities vary by feature, so confirm an action saved once you are back online. For complex work, reconnect to the full portal.")
T(['mobile push notifications','app notifications','mobile alerts','enable mobile push','phone alerts'],
  "Enable push notifications in the mobile app settings and allow them at the device level so you are alerted to approvals, assignments, and updates instantly. Pair this with your notification preferences to control which events reach your phone.")
T(['mobile login','biometrics','fingerprint','face id','touch id','biometric login'],
  "The mobile app supports quick, secure sign-in with biometrics such as fingerprint or face recognition after your initial login, so you do not retype credentials each time. Enable biometric unlock in the app settings; your device must have biometrics configured.")
T(['mobile catalog','request from mobile','mobile request','order from phone','catalog on mobile'],
  "Order services from your phone using the mobile app's catalog: search or browse, complete the item form, and submit. You then track the request from the app. This is ideal for quick, common requests while away from your desk.")
T(['approve on mobile','mobile approvals','approve from phone','mobile approve reject','approve on the go'],
  "Approvals are one of the best mobile tasks: open the push notification or the approvals list, review the request, and approve or reject with a comment in a couple of taps. This keeps requests moving even when you are away from your computer.")
T(['mobile incident','log incident from phone','incident on mobile','report issue mobile','create incident mobile'],
  "You can log an incident from the mobile app: describe the issue, set the category, and submit, attaching a photo of an error if it helps. This is handy for reporting issues the moment they happen, wherever you are.")
T(['agent workspace mobile','mobile agent','field agent app','agent app','onsite agent mobile'],
  "Field and support agents have a mobile experience tailored to their work, with assigned tasks, location-aware features, and quick updates from the field. If you fulfil work on site, ask your administrator about enabling the agent mobile capabilities for your role.")
T(['wearable','smartwatch','apple watch','android watch','watch notifications','wearable support'],
  "Where supported, key alerts such as approvals and major incident notifications can surface on a paired smartwatch for at-a-glance awareness, with deeper action on your phone. Enable wearable notifications through the mobile app and your watch's companion settings.")

# ============ ADMIN & DEVELOPER ============
T(['studio','application studio','app engine','develop app','create app','app development'],
  "Application development happens in the platform's Studio, an integrated environment for building scoped applications with tables, scripts, and UI in one place. Creating applications requires developer roles. Note that this portal's \"Studio\" section is for building Operations Intelligence deliverables, not platform apps.")
T(['script include','server-side script','reusable script','backend script','server script library'],
  "A Script Include is reusable server-side code, ideal for shared functions and APIs called from business rules, scripts, and other server logic. Keep it scoped, well-named, and free of duplication. Building Script Includes requires developer access in the relevant scope.")
T(['business rule','automated rule','server rule','trigger rule','db rule','record rule'],
  "A Business Rule is server-side logic that runs when records are queried, inserted, updated, or deleted, used to enforce data integrity and automate behaviour. Run them on the appropriate timing (before, after, async, or display) and keep them efficient. They require developer access to create.")
T(['ui policy','form rule','mandatory field','hide field','client rule','dynamic form rule'],
  "A UI Policy dynamically controls a form, making fields mandatory, read-only, or hidden based on conditions, without writing client code. It is the preferred, low-code way to drive form behaviour. Configuring UI Policies requires the appropriate admin or developer access.")
T(['client script','form load','field change','browser script','onload script','onchange script'],
  "A Client Script runs in the browser on events such as form load, field change, or submit, for client-side validation and interactivity. Use it sparingly to keep forms fast, and prefer UI Policies for simple show, hide, and mandatory logic. It requires developer access.")
T(['application scope','app scope','scope prefix','scoped app','namespace','scoped application'],
  "An application scope isolates an app's tables, scripts, and configuration under a unique namespace prefix, preventing collisions and protecting platform integrity. Cross-scope access is governed explicitly. This Operations Intelligence solution lives in the x_infte_ops_int scope.")
T(['update set','change capture','export config','migrate config','config migration','move changes'],
  "An Update Set captures configuration changes so they can be moved between instances, for example from development to production. Keep one logical change per set, complete it, and migrate it in order. Data is moved separately from configuration.")
T(['import set','data import','csv import','excel import','import xml','load data'],
  "Import Sets stage external data from files or feeds into a temporary table, then a Transform Map maps and loads it into the target table. Use them for bulk loads and recurring feeds. Validate a sample first and define coalesce fields to avoid duplicates.")
T(['transform map','field mapping','coalesce','transformation','map fields','data transform'],
  "A Transform Map defines how staged import data maps onto target fields, with coalesce fields that match existing records to update rather than duplicate them. Add field maps and any scripting needed, then run a test transform to confirm the result before going live.")
T(['rest api','api integration','rest call','outbound rest','api endpoint','consume api'],
  "To consume an external service, configure an outbound REST message with the endpoint, method, headers, and authentication, then call it from server script or a flow action. Handle responses and errors explicitly. Store credentials securely rather than in code.")
T(['scripted rest','create api','rest api endpoint','expose api','inbound api','build api'],
  "A Scripted REST API exposes your own endpoints so other systems can call the platform, with defined resources, methods, and security. Validate input, enforce access, and return clear responses and status codes. The Operations Intelligence engine is exposed this way under its scope.")
T(['integration hub','spoke','flow action','api action','integrationhub','integration spoke'],
  "IntegrationHub provides pre-built spokes and flow actions to connect to external systems from Flow Designer without custom code, covering common platforms and protocols. Use a spoke where one exists to save effort, and a custom action or REST message where it does not.")
T(['debug','troubleshoot script','script debugger','break point','debug code','step through code'],
  "Debug server logic with the script debugger and breakpoints, and use logging to trace execution and inspect values. Reproduce the issue in a sub-production instance where possible. Check system logs for errors, and narrow the problem with targeted log statements.")
T(['create table','new table','extend table','table schema','define table','add a table'],
  "Create a table in the right application scope, choosing whether to extend an existing table to inherit its fields and behaviour. Define fields with appropriate types, set sensible defaults, and add the access controls the data requires. Table creation needs developer access.")
T(['add field','new field','column type','field type','create field','field definition'],
  "Add a field by choosing a type that fits the data, such as String, Choice, Reference, Date/Time, or True/False, and set its label, length, and any default. Reference fields link records; choice fields constrain values. Plan types carefully because changing them later is harder.")
T(['data dictionary','field definition reference','table definition','dictionary entry','schema reference'],
  "The data dictionary is the catalog of every table and field, including types, attributes, and defaults. Use it to understand or adjust the underlying schema. Editing dictionary entries is an administrative action that affects all records on the table, so proceed carefully.")
T(['legacy workflow','workflow editor','workflow','graphical workflow','old workflow'],
  "The legacy graphical Workflow editor orchestrates approvals and tasks for records like requests and changes. New automation should generally use Flow Designer, but you may still maintain existing workflows. Editing workflows requires the appropriate developer access.")
T(['flow designer','create flow','automate process','orchestration','build a flow','no code automation'],
  "Flow Designer is the low-code tool for automating processes with triggers, conditions, and actions, including IntegrationHub spokes for external systems. Use it to replace scripts and legacy workflows with maintainable, visual automation. Building flows requires the relevant access.")
T(['scheduled job','automated job','job schedule','recurring job','cron job','scheduled script'],
  "A Scheduled Job runs a script or task on a defined schedule, such as nightly cleanup or periodic syncs. Set its frequency and keep its work efficient to avoid load. Creating scheduled jobs is an administrative action; ensure each job is necessary and monitored.")
T(['sys property','system property','configuration value','global setting','system property value'],
  "System properties store configurable values that control platform and application behaviour without code changes. Admins read and set them centrally. In this solution, secrets like the engine key live in scoped system properties and are never committed to source.")
T(['event registry','create event','event management config','custom event','register event','event definition'],
  "The event registry defines named events the platform can raise during processing; scripts queue events and notifications or script actions respond to them. Registering a custom event lets you decouple triggers from downstream actions. This is an administrative configuration task.")
T(['acl','access control','security rule','data restriction','acl rule','record security'],
  "Access Control Lists (ACLs) enforce who can read, write, create, or delete records and fields, evaluated by role and condition. They are the core of platform data security. Design ACLs to grant least privilege, and test them by impersonating affected users.")
T(['email script','notification script','dynamic content','mail script','notification scripting'],
  "Email scripts inject dynamic content into notifications, letting you build conditional or computed message sections beyond simple field substitution. Keep them lightweight and safe. Editing email scripts is an administrative task tied to the notification templates they serve.")
T(['domain separation','multi-tenant','domains','domain config','tenant isolation'],
  "Domain separation partitions data and configuration so multiple business units or customers operate in isolation within one instance. It is powerful but adds complexity. Use it only when true tenant isolation is required, and plan the model carefully with experienced architects.")
T(['instance upgrade','patch release','family release','upgrade planning','platform upgrade','version upgrade'],
  "Instances are upgraded to new family releases and patched for fixes and security. Plan upgrades by reviewing skipped customisations, testing in a sub-production clone, and scheduling a maintenance window. Keep customisations upgrade-safe to reduce future effort.")
T(['application manager','plugin','activate plugin','install app','plugins','enable feature'],
  "Plugins and store applications add features to the platform and are activated through the application or plugin manager by an administrator. Activate them first in a sub-production instance to test impact. Request a new plugin or app through your platform team with a clear need.")

# ============ OPERATIONS INTELLIGENCE SPECIFIC ============
T(['what is operations intelligence','about this portal','portal overview oi','this platform','what is this portal'],
  "Operations Intelligence is your central portal for running automations, building reporting deliverables, and managing operations governance. It brings together your Workspace, the Operations Gallery, Studio, Governance, and Command in one role-aware experience. Ask me anything about using it.")
T(['workspace section','my workspace','workspace overview','workspace area','operations workspace'],
  "The Workspace is your home for day-to-day operations: it lists the automations available to you through your groups and lets you trigger them and review recent executions. Open Workspace from the sidebar, then say \"Show my automations\" or \"Run [name]\" to act.")
T(['operations gallery','gallery','my deliverables','saved reports','my gallery','gallery section'],
  "The Operations Gallery holds the reports and dashboards you and your teams have created as managed deliverables. Open it from the sidebar to view, open, and organise your saved outputs. Deliverables built in Studio appear here once published.")
T(['studio section','create deliverable','build report oi','oi studio','operations studio','studio area'],
  "The Studio section is where Creators and Administrators build managed deliverables such as reports and dashboards. Open Studio from the sidebar, choose the deliverable type, and configure it; completed deliverables publish to the Operations Gallery. This requires the Creator or Administrator role.")
T(['governance section','group management','pending actions','oi governance','operations governance','governance area'],
  "The Governance section is for Leadership and Administrators to manage groups and resolve pending actions such as approvals for automations and access. Open Governance from the sidebar to review and act on items awaiting a decision. This requires the Leadership or Administrator role.")
T(['command section','admin console','command console','oi admin console','operations command','command area'],
  "The Command section is the administration console for Administrators, providing platform-level oversight and controls for Operations Intelligence. Open Command from the sidebar. It is restricted to the Administrator role.")
T(['operations assistant','oi chat','assistant features','what can the assistant do','assistant capabilities'],
  "I am the Operations Assistant. I can show your incidents, requests, approvals, groups, and executions, search the catalog and knowledge base, explain processes across IT service management, and trigger automations you are entitled to run. Type \"help\" for a full menu.")
T(['what is an automation','oi automation','automate process oi','automation definition','automation meaning'],
  "An automation in Operations Intelligence is a packaged, governed operation you can run from your Workspace, executed by the platform's engine and recorded as an execution. Automations are made available to you through your groups, with approvals where required.")
T(['automation catalog','available automations','my automations','automation list','list of automations'],
  "Your available automations come from the groups you belong to. Say \"Show my automations\" and I will list them with their descriptions and owning groups, or open the Workspace section to browse them. To run one, say \"Run [automation name]\".")
T(['run automation','trigger automation','execute automation','fire automation','start automation','launch automation'],
  "To run an automation, say \"Run [automation name]\" and I will trigger it if you are entitled, returning the execution number and status. You can also trigger automations from the Workspace section. Say \"Show my automations\" first if you are unsure of the exact name.")
T(['what is execution','automation run record','execution status','execution definition','what is an execution'],
  "An execution is a single run of an automation, with a number, a status such as running, succeeded, or failed, and a record of who triggered it and when. Each time you run an automation a new execution is created so the activity is fully traceable.")
T(['execution history','my executions','past runs','automation log oi','execution log','run history'],
  "To review your recent runs, say \"Show recent executions\" and I will list your latest automation executions with their status and timestamps. You can also browse execution history from the Workspace. Each execution records its outcome for audit and troubleshooting.")
T(['oi group','operations group','group membership oi','my oi groups','operations intelligence group'],
  "Operations Intelligence groups control which automations and deliverables you can access and what role you hold within each. Say \"What groups am I in?\" to see your memberships. To join a group or gain access, contact your administrator or the group owner.")
T(['oi roles','admin role','leadership role','creator role','user role','operations intelligence roles'],
  "Operations Intelligence has four roles:\n- Administrator: full platform control, including the Command console\n- Leadership: governance, group management, and approvals\n- Creator: build reports and dashboards in Studio\n- User: run automations and view the Gallery\nSay \"Who am I?\" to see your current roles.")
T(['enroll user','add user oi','enroll to oi','register user oi','onboard to operations intelligence'],
  "Enrolling a user into Operations Intelligence grants them a role and the relevant group memberships so they can access automations and deliverables. This is an administrative action performed in Governance or Command. Contact your administrator to enrol a colleague.")
T(['unenroll','remove user oi','deactivate from oi','offboard from operations intelligence','remove from oi'],
  "Unenrolling a user removes their Operations Intelligence roles and group memberships so they lose access to automations and deliverables, while history is retained. This is an administrative action. Contact your administrator to unenrol someone, for example when they change roles or leave.")
T(['managed artifact','what is artifact','oi artifact','deliverable concept','managed deliverable'],
  "A managed artifact is a governed object that Operations Intelligence creates and tracks, such as a report or dashboard deliverable, kept within the application scope and update set. This governance ensures changes are captured, auditable, and portable between instances.")
T(['create report oi','report builder oi','oi report','build report in studio','new oi report'],
  "To create an Operations Intelligence report, open the Studio section, choose Report as the deliverable type, and follow the builder to name and configure it. Once published, the report appears in your Operations Gallery. This requires the Creator or Administrator role.")
T(['create dashboard oi','dashboard builder oi','oi dashboard','build dashboard in studio','new oi dashboard'],
  "To create an Operations Intelligence dashboard, open the Studio section, choose Dashboard as the deliverable type, and follow the builder to assemble and configure it. The finished dashboard publishes to your Operations Gallery. This requires the Creator or Administrator role.")
T(['data alert','create alert','threshold alert','monitoring alert','set up alert','data threshold'],
  "A data alert watches a metric and notifies you when it crosses a threshold, so you learn about issues without constantly checking dashboards. Define the condition, threshold, and recipients. Configuring alerts is typically a Creator or Administrator task in the relevant section.")
T(['notification rule oi','alert rule','trigger notification oi','oi notification rule','automated alert rule'],
  "A notification rule in Operations Intelligence defines when an alert or message is sent and to whom, based on conditions such as an execution failing or a threshold being crossed. Administrators configure these rules so the right people are informed automatically.")
T(['operations intelligence admin','oi admin tasks','admin duties','administrator responsibilities oi','oi administration'],
  "As an Operations Intelligence Administrator you manage users and roles, groups and their automations, governance approvals, and platform configuration from the Command console. You also oversee the engine, update set, and credentials. Open Command for the full administrative toolset.")
T(['oi permissions','who can do what','access control oi','permission matrix oi','oi access levels'],
  "Access in Operations Intelligence follows the four roles: Users run automations and view the Gallery; Creators also build deliverables in Studio; Leadership also manages governance and groups; Administrators also use Command and configure the platform. Say \"Who am I?\" to see your access.")
T(['maintenance mode','portal under maintenance','maintenance window oi','oi maintenance','maintenance mode oi'],
  "Maintenance mode lets administrators temporarily restrict the portal during planned work so changes are made safely. While active, some functions may be unavailable to general users. Administrators enable and disable it from the Command console and should communicate the window in advance.")
T(['export application','migrate oi','move oi instance','deploy oi','export operations intelligence'],
  "Operations Intelligence configuration is captured in its update set and application scope so it can be migrated between instances in a controlled way. Administrators export the update set and the scoped application, then import them in order. Credentials are handled separately and never committed to source.")
T(['update set oi','oi configuration export','export oi changes','oi update set','capture oi changes'],
  "Operations Intelligence maintains a single in-progress update set named Operations Intelligence that captures all configuration changes within its scope. Administrators use it to migrate changes between instances. The engine ensures only this one update set is used for capture.")
T(['oi api','engine api','ops int engine','api key oi','operations intelligence api','engine endpoint'],
  "Operations Intelligence exposes an engine through a scoped Scripted REST endpoint that performs governed operations under the application scope. It authenticates with a key stored in a scoped system property, never in source. Administrators manage and call the engine for configuration tasks.")
T(['service account oi','svc account','oi credentials','service account operations intelligence','integration account oi'],
  "Operations Intelligence uses a dedicated service account for its engine and integrations, with access scoped strictly to what it needs. Its credentials are stored in scoped system properties and are never committed to source. Administrators govern its use and rotation.")
T(['script includes oi','oi backend','oi server logic','operations intelligence script','oi backend code'],
  "The Operations Intelligence backend uses scoped Script Includes for its execution engine and shared server logic, all within the x_infte_ops_int scope. This keeps the solution isolated and maintainable. Changes to backend logic are administrative or developer tasks governed by the update set.")
T(['oi tables','custom tables oi','oi database','oi schema','operations intelligence tables','oi data model'],
  "Operations Intelligence stores its data in scoped tables such as groups, automations, executions, and pending actions under the x_infte_ops_int scope. This isolated schema underpins the Workspace, Gallery, Governance, and Command experiences. Schema changes are administrative and captured in the update set.")

# ============ SECURITY ============
T(['security incident','cybersecurity incident','breach','data breach','security alert','report security incident'],
  "If you suspect a security incident or data breach, act fast: do not attempt to investigate alone, preserve evidence, disconnect a compromised device from the network if advised, and report it immediately through the security incident channel or by raising a high-priority incident. Time matters, so escalate without delay.")
T(['phishing','phishing email','suspicious email','email fraud','social engineering','report phishing'],
  "If you receive a suspicious or phishing email, do not click links or open attachments and do not reply. Report it using your organisation's phishing report button or by forwarding it to the security team, then delete it. When unsure, treat unexpected requests for credentials or payment as suspicious.")
T(['malware','virus','ransomware','suspicious software','infected computer','malware response'],
  "If you suspect malware or ransomware, disconnect the device from the network immediately to limit spread, do not power it off if asked to preserve evidence, and contact IT Security right away. Do not pay any ransom. Reporting fast gives the team the best chance to contain the threat.")
T(['password security','strong password','password policy','password requirements','password best practice','secure password'],
  "Use long, unique passwords or passphrases for each account, never reuse them, and store them in an approved password manager rather than writing them down. Enable multi-factor authentication wherever possible. Never share your password, and change it immediately if you suspect it is compromised.")
T(['mfa setup','two factor setup','multi factor setup','2fa setup','authenticator','set up mfa'],
  "Set up MFA from your security settings: register an authenticator app or your chosen method, then confirm a test code. MFA adds a strong second layer beyond your password. Keep a backup method enrolled in case you lose access to your primary device.")
T(['data classification','sensitive data','confidential data','pii','data protection','classify data'],
  "Classify data by sensitivity, for example Public, Internal, Confidential, and Restricted, and handle each according to policy, with the strongest controls on personal and confidential data. Share sensitive data only with authorised people through approved channels, and never expose it in screenshots or exports.")
T(['access review','entitlement review','user access review','quarterly review','recertification','review access'],
  "Access reviews periodically confirm that each person still needs their roles and group memberships, removing access that is no longer justified. If you are asked to certify access for your team, review each entitlement honestly and revoke anything unnecessary to uphold least privilege.")
T(['vulnerability','security patch','patch management','cve','vulnerability management','apply patches'],
  "Vulnerabilities are tracked and remediated through patching and configuration changes, prioritised by severity and exposure. Keep your devices and software updated, apply prompted patches promptly, and report any system you believe is unpatched or exposed so it can be remediated.")
T(['security awareness','security training','phishing simulation','awareness training','security education'],
  "Security awareness training and phishing simulations build the habits that keep you and the organisation safe. Complete assigned training on time, treat simulations as practice, and apply what you learn, especially caution with unexpected emails and requests for credentials.")
T(['insider threat','suspicious activity','misuse','report suspicious','unusual behaviour','report misuse'],
  "If you notice suspicious activity or misuse, such as unauthorised access, unusual data movement, or behaviour that breaches policy, report it through the appropriate confidential channel. Do not confront anyone yourself. Prompt, discreet reporting lets the right team investigate properly.")
T(['gdpr','data privacy','privacy policy','personal data','privacy rights','data subject'],
  "Personal data is protected under privacy regulations such as GDPR, which require lawful, limited, and secure processing and uphold individuals' rights over their data. Handle personal data only for legitimate purposes, minimise what you collect, and route privacy requests to the responsible team.")
T(['audit','compliance audit','sox','iso 27001','security audit','audit readiness'],
  "Audits verify that controls operate as intended against standards such as SOX or ISO 27001. Keep records accurate and complete, follow defined processes, and retain the evidence auditors expect. If you are asked for audit evidence, provide the authoritative records from the platform.")

# ============ HR & PERSONAL ============
T(['leave request','time off','vacation request','pto','annual leave','sick leave'],
  "Request leave through your HR system or the HR catalog: choose the leave type and dates, and submit for your manager's approval. Check your balance before requesting, and give as much notice as you can for planned leave. For sickness, follow your absence-reporting process.")
T(['payroll query','salary question','pay slip','paycheck','salary inquiry','payslip question'],
  "For pay, salary, or payslip questions, contact the Payroll or HR team, typically through an HR service request so your query is tracked confidentially. Payslips are usually available in your HR or payroll self-service portal. Avoid sharing salary details over insecure channels.")
T(['benefits','health insurance','dental','vision','enrollment','benefits package'],
  "Find and manage your benefits, including health, dental, and vision, through the HR benefits portal, especially during open enrolment windows. For specific questions or to make changes outside enrolment, raise an HR service request so a benefits specialist can assist you.")
T(['performance review','appraisal','annual review','360 review','goal setting','performance appraisal'],
  "Performance reviews and goal setting run through your HR or performance system, where you record objectives, gather feedback, and complete appraisals with your manager. Watch for review-cycle deadlines, prepare examples of your impact, and keep goals specific and measurable.")
T(['training','learning','course','certification','skill development','lms'],
  "Access courses and certifications through your Learning Management System (LMS). Enrol in assigned and elective training, track your progress, and record completed certifications. For role-specific training needs, ask your manager or raise an HR request to arrange it.")
T(['expense claim','expense report','reimbursement','business expenses','claim expenses','submit expenses'],
  "Submit expenses through your expense or finance system: itemise costs, attach receipts, and send for manager approval. Follow the expense policy on eligible costs and limits, submit promptly, and keep receipts. Approved claims are reimbursed per your finance schedule.")
T(['travel request','business travel','book travel','travel approval','arrange travel','travel booking'],
  "Arrange business travel through your travel or HR process: get approval, then book within policy using the approved booking channel. Plan ahead for better fares and required approvals, keep receipts for expenses, and check any travel-risk or visa requirements for your destination.")
T(['work from home','remote work','wfh policy','home working','hybrid work','remote work policy'],
  "Remote and hybrid working follows your organisation's policy on eligibility, expectations, and equipment. Confirm your arrangement with your manager, ensure you have a secure connection such as VPN, and follow data-protection rules when working away from the office.")
T(['timesheet','time tracking','time entry','log time','hours worked','submit timesheet'],
  "Record your hours in the timesheet or time-tracking system against the correct projects or categories, and submit by the deadline for approval. Enter time accurately and promptly so reporting and any billing are correct. Ask your manager if you are unsure how to allocate time.")
T(['emergency contact','personal details update','address change','update emergency contact','change address'],
  "Keep your personal details, including your address and emergency contact, current in your HR self-service profile. Accurate details matter for payroll, benefits, and safety. If a field is locked, raise an HR request to have it updated by the HR team.")
T(['offboarding','leaving company','resignation','handover','last day','employee exit'],
  "Offboarding covers handover, returning equipment, and removing access. Work with your manager and HR on a handover plan, return assets, and complete exit steps. IT will deactivate accounts and reclaim licences on your last day, so finish any personal admin beforehand.")

# ============ IT COMMON ISSUES ============
T(['slow computer','pc slow','computer performance','computer freezing','computer lags','machine is slow'],
  "If your computer is slow, restart it first, then close unused applications and browser tabs and check available disk space. Confirm pending updates have finished installing. If it stays slow after a restart, raise an incident with the symptoms and timing so IT can investigate.")
T(['blue screen','bsod','system crash','crash dump','blue screen error','computer crashed'],
  "A blue screen means the system hit a critical error and restarted. Note any error code or message shown, then restart and see if it recurs. If it happens repeatedly, raise an incident with the error code, what you were doing, and how often it occurs so IT can diagnose it.")
T(['internet not working','no internet','wifi not connecting','network issue','offline','cannot connect to network'],
  "For connectivity issues, check whether other devices are affected, confirm Wi-Fi is on and you are joined to the right network, and restart your router or reconnect. Try a wired connection if available. If it persists or affects others, raise an incident noting your location and what you have tried.")
T(['email not working','outlook issue','cant send email','email problem','email down','mailbox issue'],
  "For email problems, check your internet connection, restart the mail app, and confirm the issue is not a single stuck message. Verify you are not over any mailbox limit. If sending or receiving still fails, raise an incident describing whether it affects sending, receiving, or both.")
T(['printer not working','cant print','printer offline','print issue','printing problem','printer error'],
  "If printing fails, confirm the printer is on and shows online, check for paper or toner and any error light, and try printing a test page. Restart the printer and reconnect if needed. If it stays offline, raise an incident with the printer name or location and the error shown.")
T(['software crash','application not working','app freezes','software error','program crashes','app keeps closing'],
  "If an application crashes or freezes, close and reopen it, restart your computer, and confirm it is up to date. Note any error message. If it keeps failing, raise an incident with the application name, the exact error, and the steps that trigger it so IT can reproduce and fix it.")
T(['microphone not working','audio issue','sound problem','camera not working','webcam','no sound'],
  "For audio or camera problems, check the device is connected and selected as the default in your settings, confirm the app has permission to use it, and unmute or raise the volume. Restart the app and test again. If it still fails, raise an incident noting the device and the app affected.")
T(['second screen','dual monitor','display not working','screen issue','monitor problem','external display'],
  "For display issues, reseat the monitor cable at both ends, confirm the monitor is powered on the right input, and check your display settings to detect and arrange screens. Try a different cable or port. If the screen stays blank, raise an incident with the monitor and connection details.")
T(['keyboard not working','mouse not working','peripheral not working','usb device','device not recognized','keyboard mouse issue'],
  "For a keyboard, mouse, or other peripheral, try a different USB port, reconnect or replace batteries for wireless devices, and restart your computer. Test the device on another machine if you can. If it is still not recognised, raise an incident with the device type and model.")
T(['storage full','disk full','low disk space','hard drive full','out of space','clear disk space'],
  "If your disk is full, empty the recycle bin, clear temporary files and downloads, and remove or archive large files you no longer need locally, moving them to approved cloud storage. If you genuinely need more space, raise a request so IT can help with storage or an upgrade.")
T(['vpn not connecting','vpn issue','vpn slow','remote access problem','vpn drops','vpn error'],
  "For VPN trouble, confirm your internet works without the VPN, restart the VPN client, and reconnect, checking you are using the correct profile and credentials. A different network can help if one is blocked. If it still fails, raise an incident with the error and your connection type.")
T(['mfa not working','two factor fail','authenticator issue','2fa problem','cant get code','mfa locked'],
  "If MFA is not working, check your device's time is correct, try generating a fresh code, and use a backup method if you have one enrolled. Ensure you are approving the right sign-in prompt. If you have lost access to all methods, contact IT Support to verify your identity and reset MFA.")
T(['phone issue','desk phone','softphone','voip issue','phone not working','telephony problem'],
  "For phone problems, check the handset or headset connection and that you are signed in to the softphone, and confirm your network is up since VoIP relies on it. Restart the phone or app. If calls still fail, raise an incident with your extension and whether it affects inbound, outbound, or both.")
T(['teams issue','zoom issue','webex issue','video call issue','meeting problem','video conferencing'],
  "For conferencing problems, check your internet, confirm the app is updated, and verify your camera and microphone are selected and permitted. Rejoin the meeting or use the dial-in option if available. If quality is poor, a wired connection helps; raise an incident if issues persist across meetings.")
T(['file share','shared drive','network drive','mapped drive','access denied file','cannot open file'],
  "For shared-drive access, confirm you are connected to the network or VPN, reconnect the mapped drive, and check you have permission to the folder. An access-denied error usually means a permission issue. Raise a request for access to the specific share if you need it, naming the path.")
T(['sharepoint','onedrive','cloud storage','file sync','sync issue','onedrive not syncing'],
  "For cloud file sync issues, confirm you are signed in, check the sync client status for errors, and ensure you have space and connectivity. Pausing and resuming sync often clears stuck files. If a file will not sync or shows a conflict, note its name and raise an incident.")
T(['office 365','microsoft 365','m365','o365 issue','microsoft apps','office apps not working'],
  "For Microsoft 365 issues, confirm you are signed in with your work account, check the service is not under a known outage, and restart the affected app. Repairing the Office installation can help persistent problems. If it continues, raise an incident naming the specific app and error.")
T(['access denied','permission denied','unauthorized','no access','403','forbidden'],
  "An access-denied or unauthorised error means your account lacks permission to that resource. Confirm you are logged in with the right account, and request access through the catalog with a business justification if you genuinely need it. Include the exact resource and error when raising the request.")

# Extra fillers to comfortably exceed 500: more granular ITSM/platform topics
T(['incident sla pause','pause incident sla','stop incident clock','hold incident timer'],
  "An incident's SLA pauses when you move it to a defined On Hold reason such as Awaiting Caller or Awaiting Vendor, so waiting time is not counted against the target. Use the correct reason and a clear work note, and move it back to In Progress as soon as you can act.")
T(['caller','requested for','affected user','who is affected','incident caller'],
  "The Caller (or Affected User) is the person experiencing the issue, while the person logging it may differ. Set the Caller accurately so updates reach the right user and reporting reflects true impact. Use the Requested For field on requests for the same reason.")
T(['assignment group','support group','which team','route ticket','assign group','team queue'],
  "The Assignment Group is the team responsible for a record, and routing it correctly gets it to the people who can resolve it fastest. Choose the group that owns the affected service. If you are unsure, the service desk can route it, or pick the closest match and add a note.")
T(['short description','description field','summarize issue','title the ticket','ticket summary'],
  "Write a clear, specific short description that states the symptom and the affected service, for example \"Outlook will not send for the Finance team\". Use the full description for detail, steps to reproduce, and error messages. Good summaries speed triage and routing.")
T(['attach screenshot','add attachment','attach file to ticket','upload file','add evidence'],
  "Attach screenshots, logs, or files to a ticket to give the team the evidence they need, using the attachment control on the record. Capture the full error message in your screenshot. Mind data classification, and avoid attaching anything sensitive that is not necessary.")
T(['reassign group','wrong team','misrouted ticket','sent to wrong group','reroute'],
  "If a ticket reached the wrong team, update the Assignment Group to the correct one and add a work note explaining the reroute so the new team has context. Avoid bouncing tickets without notes, as clear handovers prevent delay and frustration.")
T(['close code','resolution code','how resolved','resolution category','closure code'],
  "A resolution or close code categorises how a ticket was resolved, such as Fixed, Workaround, or No Fault Found, supporting accurate reporting and trend analysis. Choose the code that genuinely reflects the outcome and always pair it with a clear resolution note.")
T(['knowledge from incident','create kb from ticket','article from incident','document the fix'],
  "When you resolve a novel issue, capture the fix as a knowledge article so the next person can self-serve. Many tools let you create an article directly from the resolved incident. A short, clear article reduces future tickets and speeds resolution.")
T(['catalog search tips','find the right item','search catalog better','catalog not finding'],
  "When searching the catalog, use the specific item or service name rather than a sentence, try synonyms, and browse the relevant category if search comes up short. If you still cannot find what you need, the service desk can point you to the right item or create a request for you.")
T(['my open tasks','assigned to me','my work','my queue','tasks assigned to me','my assignments'],
  "To see work assigned to you, check your task or queue view, where incidents, requests, and other tasks awaiting your action are listed. In this portal you can also say \"Show my incidents\", \"Show my requests\", or \"Show my approvals\" and I will list them for you.")
T(['priority change','reprioritize','bump priority','lower priority','adjust priority'],
  "To change a ticket's priority, adjust the Impact and Urgency, which recalculates the priority, and add a work note explaining why. Raising priority should reflect genuine business impact; document the justification so the change is clear and auditable.")
T(['ticket aging','old tickets','stale tickets','backlog cleanup','overdue tickets'],
  "Aging or stale tickets are those untouched for too long and risk breaching SLAs. Review your queue regularly, update or progress the oldest items first, and close anything already resolved. A report grouped by age helps you target the backlog efficiently.")
T(['cmdb impact analysis','impact analysis','blast radius','what is affected by change','dependency impact'],
  "Impact analysis uses CI relationships to show everything affected by an incident or change, so you can assess the blast radius before acting. Open the affected CI's dependency map. Accurate relationships in the CMDB are what make this analysis trustworthy.")
T(['catalog approval delay','approval taking long','stuck in approval','request not approving'],
  "If your request is stuck awaiting approval, open it to see who the approver is, then send a reminder where available or contact them directly. Reminders may also fire automatically. For genuinely urgent needs, ask the service desk about an expedited path.")
T(['knowledge gap','no article found','missing knowledge','suggest article','request kb'],
  "If you searched and found no helpful article, you have spotted a knowledge gap. Raise a request or note suggesting the article, ideally describing the question and the answer you eventually found. This helps the knowledge team fill the gap for the next person.")
T(['vip user','executive support','priority user','vip ticket','executive incident'],
  "Designated VIP or executive users may receive enhanced support and tighter SLAs. Their tickets are flagged for priority handling and clear communication. If you support VIPs, follow the defined process and keep them proactively updated throughout the issue.")
T(['service request vs incident','difference between request and incident','request or incident','which one to raise'],
  "Use an Incident when something is broken or not working as expected, and a Service Request when you want something new, such as access, equipment, or a service. Choosing correctly routes the work to the right process. When unsure, describe the situation and I can point you to the right one.")
T(['change vs request','difference change request','when to raise a change','change or request'],
  "Raise a Change when you are modifying a live service or infrastructure that needs control and approval, and a Service Request for standard, low-risk fulfilment like ordering an item or access. Changes go through assessment and scheduling; requests follow catalog fulfilment.")
T(['problem vs incident','difference problem incident','when to raise a problem','problem or incident'],
  "An Incident restores service for a specific disruption, while a Problem investigates the underlying root cause to stop incidents recurring. Raise an incident to fix the immediate impact, and a problem when the same issue keeps coming back and needs a permanent fix.")
T(['self service','help yourself','self help','do it yourself','self service options'],
  "Many tasks are self-service: reset your password, order from the catalog, search knowledge, and track your requests, all without waiting for an agent. Start in the Service Portal at /sp, or ask me here and I will point you straight to the right place.")
T(['contact details','phone number support','support hours','when is support open','support availability'],
  "Support hours and contact methods vary by service, but you can always reach help through the Service Portal at /sp, raise an incident for issues, and use the catalog for requests. For urgent matters outside hours, use the emergency support line published for your organisation.")
T(['feedback','suggestion','feature request','improve the portal','idea','submit feedback'],
  "Your feedback helps improve the platform. Share suggestions through the feedback channel or by raising a request describing the idea and the benefit. Concrete examples and the problem you are trying to solve make suggestions much easier to act on.")
T(['status of everything','overview of my items','summary of my tickets','my dashboard summary'],
  "For a quick overview, ask me \"Show my incidents\", \"Show my requests\", and \"Show my approvals\" to see each area, or open the portal homepage for a combined view. I can pull each list for you here so you can act without navigating away.")
T(['escalate request','urgent request','expedite request','rush my request','speed up request'],
  "If a request is genuinely urgent, add a comment to it explaining the business need and deadline, and contact the fulfilling team or service desk to ask about expediting. Approvals and stock can limit how fast it moves, so flag urgency early and clearly.")
T(['cancel automation','stop execution','abort run','halt automation','kill execution'],
  "If you need to stop a running automation, check the execution record for a stop or cancel option, which may depend on the automation and your role. If none is available, contact your administrator. Note the execution number so the right run can be identified quickly.")
T(['automation failed','execution failed','run failed','why did it fail','failed automation'],
  "If an execution failed, open its record to read the status detail and any error message, which usually points to the cause. You can correct the inputs and run it again. If the failure is unclear or recurring, share the execution number with your administrator for help.")
T(['automation permissions','cant run automation','not entitled','no automations','access to automation'],
  "You can only run automations made available through your groups. If you cannot see or run one you need, say \"What groups am I in?\" to check your memberships, then contact your administrator or the group owner to request access to the automation.")
T(['gallery empty','no deliverables','nothing in gallery','gallery has nothing','empty gallery'],
  "If your Operations Gallery is empty, no reports or dashboards have been shared with you or created under your access yet. Creators build deliverables in the Studio section, which then appear here. Ask a Creator or your administrator to share the deliverables you need.")
T(['governance approvals','pending governance actions','approve in governance','governance queue'],
  "The Governance section lists pending actions awaiting a Leadership or Administrator decision, such as approving an automation for a group or an access change. Open Governance from the sidebar to review each item's detail and approve or reject it with a comment.")
T(['command tools','admin tools oi','command capabilities','what is in command','administration console'],
  "The Command console gives Administrators platform-level controls for Operations Intelligence, including oversight of users, groups, automations, executions, and configuration. It is restricted to the Administrator role; open it from the sidebar if you have that access.")
T(['who can approve automation','automation approval','approve an automation','automation governance'],
  "Making an automation available to a group typically requires governance approval by Leadership or an Administrator, recorded as a pending action. Once approved, members of that group can run it. Check the Governance section to see automations awaiting approval.")
T(['reset my mfa','lost authenticator','new phone mfa','mfa device lost','re-enroll mfa'],
  "If you lost the device with your authenticator, use a backup method to sign in and re-enrol a new one in your security settings. If you have no backup method, contact IT Support to verify your identity and reset MFA so you can enrol your new device.")
T(['account disabled','account inactive','account suspended','my account is disabled','reactivate account'],
  "If your account is disabled, it may be due to inactivity, a security action, or an offboarding step. Contact IT Support or your manager to confirm the reason and request reactivation if appropriate. They can verify your identity and restore access where it is warranted.")
T(['data export','bulk export','export records','download dataset','extract data'],
  "You can export list data to CSV, Excel, or PDF from the list's export action, subject to your access and data-handling rules. For large or sensitive extracts, prefer a scheduled report or ask an administrator, and never export confidential data to unapproved locations.")
T(['scheduled maintenance notice','upcoming maintenance','planned outage notice','maintenance announcement'],
  "Planned maintenance is announced in advance with the window and expected impact so you can plan around it. Check the portal announcements or your notifications for upcoming maintenance. During the window, some services may be unavailable as described in the notice.")
T(['report a bug','something looks wrong','portal error','application bug','glitch'],
  "If you hit a bug or error in the portal, note what you were doing, the exact message, and the time, then raise an incident with those details and a screenshot if possible. Reproducible steps help IT fix it quickly. If it blocks critical work, flag the urgency.")
T(['language not supported','wrong language','interface language','change interface language'],
  "If the interface shows the wrong language, set your preferred language in your profile preferences. If your language is not listed, your administrator may need to enable it. Date and number formats follow your locale setting, which you can adjust in the same place.")
T(['notification not actionable','approval link broken','cant act on notification','notification link not working'],
  "If a notification link does not let you act, try opening the record directly in the portal and acting there, for example from /sp?id=approvals for approvals. If the link is genuinely broken, raise an incident with the notification details so the template can be checked.")

# ============ ADDITIONAL DEPTH (to exceed 500 topics) ============
# More incident depth
T(['incident assignment rules','auto assignment','assignment routing','how is incident assigned'],
  "Incidents route to an assignment group based on category, affected service, or location rules, and within the group a fulfiller picks them up. If routing seems wrong, set the correct group and add a work note. Good categorisation up front drives accurate auto-assignment.")
T(['incident sla report','incident performance report','incident dashboard','incident analytics'],
  "Incident performance is best viewed in a dashboard combining volume, backlog, SLA compliance, and resolution time by priority and group. Build one in the Studio section or use Performance Analytics. Trends here reveal where capacity or process needs attention.")
T(['incident knowledge link','attach article to incident','resolve with article','suggested resolution'],
  "When working an incident, search knowledge for a matching fix and attach the article to the resolution so the user and future agents benefit. Many tools suggest relevant articles automatically. Linking the article also feeds knowledge analytics on deflection.")
T(['incident parent child','parent incident','child incident','related incidents','incident hierarchy'],
  "For widespread issues you can set a parent incident and link children to it, so one investigation and resolution covers them all. Updates and closure can cascade from the parent. Use this with major incidents to manage scale without losing individual records.")
T(['incident sla extension','extend sla','sla exception','sla waiver','justify breach'],
  "If a breach was unavoidable, document the reason clearly in work notes; some organisations allow an SLA exception or waiver subject to governance. Do not adjust records to hide genuine performance issues. Persistent breaches should drive a process or capacity review.")
T(['who is assigned','assignee','current owner','responsible person','ticket owner'],
  "The Assigned To field shows who currently owns the record, while the Assignment Group shows the responsible team. Open the record or say \"Check INC0001234\" to see the assignee. If it is unassigned, a group member needs to pick it up.")
T(['incident closure notes','closure notes','closing comments','final notes','wrap up notes'],
  "Closure notes summarise the resolution for the record and the requester: what was wrong, what fixed it, and any follow-up. Clear closure notes help future diagnosis of similar issues and give the user confidence the matter is genuinely resolved.")

# More request/catalog depth
T(['variable set','catalog variables','request form fields','item questions','catalog questions'],
  "Catalog items collect details through variables, the questions on the order form, so fulfilment has what it needs. Answer them accurately to avoid back-and-forth. If a required field is unclear, hover for help text or contact the service owner before submitting.")
T(['delivery address','where will it be delivered','shipping','request delivery location','collection point'],
  "Where a request needs a delivery or collection location, the item form includes an address or location field, so set it correctly. For hardware, confirm your current office or home address per policy. If the field is missing, add a comment specifying where you need it.")
T(['request comments','add comment to request','message fulfiller','request conversation','contact fulfiller'],
  "Use the comments on your requested item to communicate with the fulfiller, ask for an update, or provide extra information. Comments are tracked on the record. Open your request at /sp?id=requests, choose the item, and add your comment there.")
T(['reorder','order again','repeat order','duplicate request','same as last time'],
  "To reorder something you have had before, open the same catalog item and submit a new request, or find it in your request history and use a reorder option if available. There is no single button to clone all past orders, so resubmit the specific items you need.")
T(['catalog availability','item out of stock','temporarily unavailable','stock issue','backorder'],
  "If a catalog item is out of stock, your request may go on hold pending availability, with the hold reason shown on the requested item. The fulfilling team manages restock and will progress it when stock arrives. Add a comment if you have an urgent deadline.")
T(['gift or loan equipment','loaner','temporary equipment','spare device','short term equipment'],
  "For short-term needs, look for a loaner or temporary-equipment item in the catalog, which provides a device for a defined period before return. If none exists, raise a request describing the need and duration so the service desk can arrange a loan.")

# More change depth
T(['change ticket number','change number','crq number','find a change','look up change'],
  "Change records carry their own numbers, often prefixed CHG, separate from incidents and requests. Search the change list by number or short description to find one. Use the change calendar to see scheduled changes around a date you care about.")
T(['change owner','change manager','who owns the change','change coordinator','change requester'],
  "A change has a requester who proposes it and often a change manager or coordinator who shepherds it through assessment and scheduling. Responsibilities are recorded on the change. For questions on a specific change, contact the named owner on the record.")
T(['change priority','urgent vs normal change','prioritize change','change urgency'],
  "Change priority reflects urgency and business need and influences scheduling and approval speed, but it does not bypass risk assessment except for genuine emergencies. Set it honestly, and use the emergency type only when an urgent fix truly cannot wait for normal scheduling.")
T(['change attachments','attach plan to change','change documentation','supporting documents change'],
  "Attach supporting documents such as detailed runbooks, test evidence, or architecture diagrams to the change so the CAB and implementers have full context. Keep attachments current and relevant. Reference them in the implementation and back-out plan fields.")
T(['change success rate','change kpi','failed changes','change metrics','change quality'],
  "Change metrics include success rate, emergency change ratio, and the proportion causing incidents. A high failure or emergency ratio signals process gaps. Track these in a dashboard to drive better planning, testing, and risk assessment over time.")

# More problem depth
T(['problem owner','problem manager','who owns the problem','problem coordinator'],
  "A problem has an owner responsible for driving root-cause analysis to a permanent fix, coordinating the technical teams and tasks. Responsibilities are recorded on the problem. For status on a specific problem, contact its owner or review its activity stream.")
T(['proactive problem','prevent incidents','trend analysis problem','proactive problem management'],
  "Proactive problem management analyses incident trends to find and fix latent issues before they cause more disruption, rather than waiting for recurrence. Use incident reporting to spot patterns, then raise problems for the highest-impact trends to prevent future incidents.")
T(['problem closure','close the problem','problem resolved criteria','when to close problem'],
  "Close a problem once the permanent fix is deployed and verified to stop the linked incidents recurring, and the review is complete. Record the root cause, the fix, and any preventive actions before closing so the knowledge is preserved for the future.")

# More knowledge depth
T(['knowledge ownership','article owner','who maintains article','knowledge steward'],
  "Each article has an owner responsible for keeping it accurate through the review cycle. If an article is wrong or outdated, flag it so the owner can act. For a new article in a domain, the relevant knowledge owner or subject expert is the right author.")
T(['quick answer','self help article','how-to guide','step by step guide','instructions article'],
  "For step-by-step help, search the knowledge base for a how-to article using the specific task name, for example \"set up email on a new phone\". Ask me the question directly and I will surface matching articles, or browse categories at /sp?id=kb_home.")
T(['knowledge search not working','kb search no results','cant find article','search returns nothing'],
  "If knowledge search returns nothing, try fewer or different keywords, an exact error phrase, or browse the relevant category. Spelling and product names matter. If the content genuinely does not exist, you have found a gap worth suggesting to the knowledge team.")

# More SLA depth
T(['response sla','first response time','time to respond','acknowledgement sla','response target'],
  "The response SLA measures how quickly a record is acknowledged and worked after it is logged, distinct from the resolution SLA. Meeting response targets reassures users that their issue is in hand. Pick up new assignments promptly to protect this metric.")
T(['resolution sla','time to resolve sla','fix time','resolution target','resolution clock'],
  "The resolution SLA measures the time from logging to resolution against the priority target, pausing while the record is on a defined hold. Keep the record moving and use on-hold reasons correctly so the clock reflects genuine active work toward a fix.")
T(['multiple slas','which sla applies','overlapping sla','sla precedence'],
  "A record can carry several SLAs at once, such as response and resolution, each tracked independently. The applicable definitions depend on the record's conditions like priority and service. View the SLA related list on the record to see every timer and its status.")

# More CMDB depth
T(['ci ownership','ci owner','support group for ci','who owns this server','asset owner'],
  "Each CI should record an owner and a support group so work routes correctly and accountability is clear. If a CI's owner is missing or wrong, update it or ask the CMDB team to correct it. Accurate ownership underpins routing, impact analysis, and audits.")
T(['ci status','operational status','ci lifecycle status','retired ci','active ci'],
  "A CI's status, such as In Use, In Maintenance, or Retired, reflects its lifecycle stage and affects reporting and discovery. Keep status current, and set CIs to Retired during decommissioning so they drop out of active impact analysis and inventories.")
T(['reconcile cmdb','cmdb reconciliation','data sources','authoritative source','cmdb accuracy'],
  "Reconciliation ensures multiple data sources, like discovery and imports, agree on each CI, with a defined authoritative source per attribute to prevent overwrites. This keeps the CMDB trustworthy. Discrepancies usually point to a source or rule needing adjustment.")
T(['cmdb query','find a ci','search cmdb','look up asset','locate configuration item'],
  "To find a CI, search the CMDB by name, serial number, or asset tag, or browse by class. Open the CI to see its attributes, relationships, and related incidents and changes. The dependency map shows what it connects to for impact analysis.")

# More user/account depth
T(['change my role','request elevated access','admin rights','elevated permissions','request admin'],
  "To request additional or elevated access, raise an access request in the catalog with a clear business justification; sensitive roles route for approval before they are granted. Elevated rights follow least privilege, so request only what the task genuinely requires.")
T(['profile photo','change avatar','update picture','my photo','set profile picture'],
  "Update your profile photo from your account settings where permitted. A recognisable photo helps colleagues identify you in approvals and chats. If the option is unavailable, your photo may be managed centrally and can be updated via an HR or IT request.")
T(['manager update','wrong manager','change my manager','reporting line','update supervisor'],
  "Your manager is usually sourced from HR or the directory, so corrections start there. If your reporting line is wrong, it affects approvals routed to your manager, so raise an HR request to fix it. Once corrected, future approvals route to the right person.")

# More approvals depth
T(['approval comments visible','can requester see approval comment','approval transparency','approver notes'],
  "Comments you add when approving or rejecting are typically visible to the requester on the request, so write them to be clear and constructive. For sensitive internal context, check whether a work note rather than a customer-visible comment is more appropriate.")
T(['reassign approval','wrong approver','approval sent to me by mistake','forward approval'],
  "If an approval reached you in error, do not simply reject it; add a comment explaining and ask the requester or process owner to route it to the correct approver. Where delegation or reassignment is supported, use it. Clear handling avoids blocking the request.")
T(['approval audit report','approvals over time','approval metrics','approval turnaround'],
  "Approval metrics such as average turnaround and overdue approvals reveal bottlenecks in your processes. Build a report on the approval table grouped by approver or item to see where requests wait. Faster, well-governed approvals improve the overall experience.")

# More notifications depth
T(['digest notification','summary email','daily digest','batched notifications','one email per day'],
  "Some notifications can be batched into a digest so you receive a single summary rather than many individual emails. Where offered, choose the digest option in your notification preferences. This reduces noise while keeping you informed of the day's activity.")
T(['notification recipients','who gets notified','notification audience','cc on notification'],
  "Each notification defines its recipients, which may include the assignee, watch-list members, the caller, and managers. If the wrong people are notified or someone is missing, the template needs adjustment by an administrator. Watch lists let you add recipients per record.")

# More reports depth
T(['report subscription manage','manage scheduled reports','stop report email','unsubscribe report'],
  "Manage your report subscriptions to add, change, or stop scheduled deliveries. If you receive a scheduled report you no longer need, ask the owner to remove you or adjust the subscription. Keeping subscriptions tidy reduces inbox clutter and unnecessary processing.")
T(['report data accuracy','report numbers wrong','report not matching','report discrepancy'],
  "If a report's numbers look wrong, check its filter conditions, the time range, and any access restrictions that limit visible rows, since these commonly explain discrepancies. Compare against the source list with the same filter. If it still differs, ask the report owner to review the definition.")
T(['homepage','responsive dashboard','landing page','my homepage','default dashboard'],
  "Your homepage or landing dashboard gives an at-a-glance view of the metrics and lists you care about. Configure it with the widgets relevant to your role, and set it as your default. In this portal, the sidebar sections provide your role-specific home views.")

# More navigation depth
T(['breadcrumbs','navigation trail','where am i','current location','navigation path'],
  "Breadcrumbs at the top of a record or page show your navigation trail so you can step back to a list or parent record without losing your place. Use them with your history list to move efficiently between related records during an investigation.")
T(['list view density','compact list','list display options','rows per page','list pagination'],
  "Adjust how many rows a list shows per page and its density to suit your screen and task, using the list controls or your preferences. Showing more rows speeds scanning, while pagination keeps large lists responsive. Combine with filters to focus on what matters.")
T(['sort list','order by column','sort records','arrange list','list sorting'],
  "Sort a list by clicking a column header, or set the sort order in the filter to bring the most relevant records to the top, for example oldest first to tackle aging work. Combine sorting with grouping and filtering to organise your queue effectively.")
T(['group by','grouped list','aggregate list','list grouping','collapse groups'],
  "Group a list by a field, such as priority or assignment group, to see counts and collapse sections, turning a flat list into a quick summary. This helps you spot concentrations and work systematically. Expand a group to act on its records.")

# More portal depth
T(['portal search not working','sp search no results','portal cant find','search broken portal'],
  "If portal search returns nothing useful, try more specific terms, an exact record number, or browse the catalog and knowledge categories directly. You can also ask me here and I will search the catalog and knowledge base for you and return the best matches.")
T(['portal announcements','portal news','portal banner','portal messages','announcements'],
  "Portal announcements share important news such as planned maintenance, outages, or new services, usually as a banner or news area on the homepage. Check them when you sign in so you are aware of anything that might affect your work that day.")

# More security depth
T(['secure file sharing','share sensitive file','encrypt file','safe file transfer','protect attachment'],
  "Share sensitive files only through approved, secure channels with appropriate access controls, and avoid emailing confidential data or posting it in open locations. Apply the correct data classification, and when in doubt, ask the security team for the approved method.")
T(['suspicious link','is this link safe','check a url','clicked a bad link','phishing link'],
  "Do not click links you are unsure about; hover to inspect the real destination and verify the sender through a trusted channel. If you have already clicked a suspicious link or entered credentials, change your password immediately and report it to IT Security.")
T(['lost device','stolen laptop','lost phone','device theft','report lost device'],
  "If a work device is lost or stolen, report it to IT and Security immediately so they can lock, wipe, or disable access remotely and revoke credentials. Speed limits exposure of any data on the device. Then raise a request for a replacement.")
T(['clean desk','screen lock','lock my screen','unattended computer','workstation security'],
  "Protect information by locking your screen whenever you step away and keeping sensitive material off your desk and screen, following the clean-desk principle. A quick screen lock prevents unauthorised access to your session and the systems you can reach.")

# More HR depth
T(['org chart','who is my manager','find a colleague','employee directory','company directory'],
  "Find colleagues and reporting lines in the employee directory or org chart, searching by name, team, or role. This is useful for routing requests and finding the right approver or expert. Your own manager appears on your profile under your reporting line.")
T(['probation','new starter checklist','first week tasks','onboarding checklist','induction'],
  "New starters typically follow an onboarding checklist covering accounts, equipment, training, and introductions. Work through it with your manager, and use the catalog and this Assistant to request what you need. Say \"onboarding help\" for a quick starter guide.")
T(['internal job','career opportunities','transfer role','apply internally','job posting'],
  "Internal opportunities and transfers are usually posted in the HR or careers system. Review openings there, discuss interest with your manager where appropriate, and follow the application process. For questions, raise an HR request or contact your HR partner.")

# More IT common issues depth
T(['password manager','vault','store passwords','credential manager','remember passwords'],
  "Use your organisation's approved password manager to store unique, strong passwords securely, rather than reusing them or writing them down. It autofills credentials and reduces risk. If you need access to the password manager, raise a request for it.")
T(['browser issue','clear cache','browser cache','cookies','page not loading','clear cookies'],
  "If a web page misbehaves, clear your browser cache and cookies, try a private window, and confirm the browser is up to date and supported. Disabling heavy extensions can help. If the issue is isolated to one site, note the exact URL and error when raising an incident.")
T(['proxy','proxy settings','corporate proxy','internet through proxy','proxy error'],
  "On the corporate network, internet traffic may route through a proxy, and misconfigured proxy settings can block access. If sites fail to load on the office network but work elsewhere, the proxy or your network profile may be the cause; raise an incident with the symptoms.")
T(['certificate error','ssl error','site not secure','invalid certificate','security warning browser'],
  "A certificate or SSL warning means the site's security certificate could not be validated, which can indicate an expired certificate or a network interception. Do not bypass warnings on sensitive sites. Report the affected site and the exact warning to IT for investigation.")
T(['slow application','app performance','application lagging','program slow','app responding slowly'],
  "If a specific application is slow, close and reopen it, check your network and device load, and confirm it is updated. Note whether others are affected, which suggests a server-side issue. Raise an incident with the app name, timing, and whether colleagues see it too.")
T(['update available','software update','apply update','pending updates','install updates'],
  "Apply prompted software and security updates promptly, restarting when asked so they finish installing, as updates fix bugs and vulnerabilities. If an update fails repeatedly or you cannot install one you need, raise an incident with the software and error.")
T(['admin password','local admin','install software myself','elevated install','need admin to install'],
  "Installing software often requires elevated rights you may not have by default. Request the application through the catalog so it is deployed properly and licensed, or request temporary elevation with justification where that process exists. Avoid unapproved installations.")
T(['screen sharing','remote support','it remote into my pc','remote assistance','share my screen with it'],
  "For hands-on help, IT can connect to your device with your permission through the approved remote-support tool. You will be asked to accept the session. Only accept remote-support requests you initiated or expected, and confirm the agent's identity if unsure.")
T(['default printer','set default printer','printer setup','add a printer','install printer'],
  "Add or set a default printer from your device's printer settings, choosing the correct printer by name or location. For network printers, you may need to be on the office network or VPN. If a printer is not listed, raise a request to have it added.")
T(['email signature','set up signature','signature not showing','update signature','company signature'],
  "Configure your email signature in your mail application's settings, following any corporate signature standard. If a standard signature is provided centrally, apply the supplied template. For help meeting the standard, check the knowledge base or raise a request.")
T(['calendar sharing','share calendar','calendar permissions','see someones calendar','book a room'],
  "Share your calendar or grant access through your mail and calendar application's sharing settings, choosing the right permission level. To view a colleague's free or busy time, add their calendar. For room booking, use the calendar's room or resource feature.")
T(['distribution list','mailing list','group email','email a team','add to distribution list'],
  "Distribution lists let you email a whole team with one address. To be added to or removed from a list, or to create one, raise a request specifying the list and the change. Use lists responsibly and avoid reply-all on large audiences.")

# Cross-cutting and meta
T(['what else can you do','more commands','other things you do','additional help','show me more'],
  "Beyond the basics, I can explain incidents, problems, changes, SLAs, the CMDB, knowledge, security, HR services, and common IT fixes, and I can show your records and run automations you are entitled to. Ask a specific question or type \"help\" for the menu.")
T(['you misunderstood','that is not what i meant','wrong answer','not helpful','try again'],
  "I am sorry I missed the mark. Please rephrase with a few specific keywords, for example the system name, the action, or a record number, and I will try again. You can also type \"help\" to see the kinds of things I can do.")
T(['talk to a person','human agent','real person','speak to a human','live agent'],
  "If you would like a person, raise an incident or service request and the relevant team will pick it up, or contact the service desk directly through the portal at /sp. For urgent issues, use your published support line. I can also create the right ticket type if you tell me the issue.")
T(['emergency','urgent help','critical issue now','need help immediately','this is urgent'],
  "For a genuine emergency or critical outage, contact the IT helpdesk directly using your published support line so it is triaged immediately, and say \"major incident\" if many users are affected. I can guide you to log it, but live emergencies need that direct, fast channel.")
T(['where is my data','data location','data residency','where is information stored','data hosting'],
  "Questions about where data is stored or processed relate to data residency and hosting arrangements governed by your organisation's policies and contracts. For specifics, raise a request to the data protection or platform team, who can confirm the hosting and residency details.")
T(['cost of service','service pricing','what does this cost','chargeback for service','budget for it'],
  "Costs and chargeback for services are owned by the service owner and finance, and where applicable a catalog item shows a price. For budget questions or cost allocations, contact the service owner or your finance partner through a request so it is tracked.")
T(['service owner','who owns this service','responsible team','service contact','service manager'],
  "Each service has an owner accountable for its delivery, roadmap, and support arrangements. To find a service owner, check the service record in the CMDB or ask the service desk. For requests or escalations about a service, route them to the owning team.")
T(['continual improvement','process improvement','csi','improve a process','suggest improvement'],
  "Continual improvement captures ideas to make services and processes better over time, drawing on metrics, reviews, and feedback. Submit improvement suggestions through the feedback or request channel with the problem and proposed benefit so they can be prioritised.")
T(['audit log','who changed this','record history meta','sys audit','field history'],
  "Most records keep an audit history of field changes with the user and timestamp, viewable in the record's activity or history view. This is the authoritative trail for who changed what and when, useful for handovers, troubleshooting, and compliance.")
T(['data retention','how long is data kept','retention policy','archive records','delete old data'],
  "Data retention is governed by policy, with records kept for a defined period and then archived or purged. For specifics on a record type's retention, consult the relevant policy or raise a request to the platform or compliance team for confirmation.")

# ============ FINAL BATCH (cross 500) ============
T(['incident reminder','follow up incident','chase incident','update on incident','any progress'],
  "To chase an incident, open it and add a customer-visible comment requesting an update, or contact the assignment group. Say \"Check INC0001234\" here and I will show its current state, priority, assignee, and last update so you know where it stands.")
T(['incident attachments missing','cant attach to incident','attachment failed','upload failed'],
  "If you cannot attach a file to an incident, check the file size and type against any limits, and try a different browser or a fresh page load. For large logs, compress them first. If uploads still fail, raise an incident describing the file and the error.")
T(['catalog item description','what does this item do','item details','about this catalog item'],
  "Each catalog item includes a description explaining what it provides, any prerequisites, and the expected fulfilment time. Open the item to read it before ordering. If the description is unclear, the service owner can clarify, or ask me and I will search for related items.")
T(['request approval status','is my request approved','approval pending on request','check approval'],
  "To see your request's approval status, open it at /sp?id=requests and review the approvers and their decisions. If it is pending, you can see who needs to approve. Say \"Show my requests\" and I will list them so you can drill into the one you mean.")
T(['change schedule conflict resolution','resolve change conflict','reschedule change','move change window'],
  "If your change conflicts with another, coordinate with the other change owner and pick a clear slot on the change calendar, then update your window. Document the agreed schedule on both changes. Avoid overlapping work on the same CIs to reduce risk.")
T(['problem candidate','should i raise a problem','problem trigger','when problem needed'],
  "Consider raising a problem when incidents recur with the same symptom, a major incident needs a root cause, or a workaround is masking an underlying fault. The aim is to fix the cause permanently. Link the related incidents so the fix resolves them together.")
T(['knowledge approval pending','article stuck in review','publish delay','article not published'],
  "If an article is stuck in review, contact the assigned reviewer or knowledge manager to progress it. Ensure it meets the content standards, which speeds approval. Once approved, it becomes searchable. Reviewers may also be reminded automatically as time passes.")
T(['sla schedule change','sla calendar wrong','wrong business hours','sla timing off'],
  "If an SLA seems to count time incorrectly, the schedule or holidays applied to it may be wrong. Confirm whether the target should run in business hours or around the clock. Report the specific record and expected behaviour so an administrator can review the SLA definition.")
T(['cmdb relationship missing','no dependencies shown','add relationship','link cis','connect cis'],
  "If a CI shows no dependencies, its relationships may be missing, which weakens impact analysis. Add the correct relationships on the CI, or ask the CMDB team to populate them, ideally through discovery. Accurate relationships are what make impact analysis reliable.")
T(['user cannot access','colleague has no access','grant access to user','provision access for someone'],
  "To grant a colleague access, they or their manager should raise an access request with justification, which routes for approval. As an admin or group owner you can add them to the relevant group or role. Least-privilege still applies, so request only what is needed.")
T(['approval delegate not working','delegation not applying','delegate cannot see approvals'],
  "If a delegate is not receiving approvals, confirm the delegation is active with valid start and end dates and covers approvals specifically. Both parties should check their preferences. If it still fails after the dates are correct, raise an incident for investigation.")
T(['notification frequency','too frequent notifications','notification overload','reduce alert frequency'],
  "If you are getting too many notifications, review your preferences and opt out of non-essential ones, switch some to in-portal only, or use a digest where offered. Watch lists you joined also generate updates, so remove yourself from records you no longer need to follow.")
T(['report scheduling failed','scheduled report not sent','report email missing','report did not arrive'],
  "If a scheduled report did not arrive, check the schedule is active, the recipients are correct, and your email is not filtering it. The report may have failed to generate if its data source changed. Ask the owner to review the schedule, or raise an incident if delivery is broken.")
T(['favorites missing','lost my favorites','favorites not showing','restore favorites'],
  "If your favourites disappeared, confirm you are signed in with the right account, since favourites are per user. They may also be collapsed in the navigation. Re-add any that are genuinely missing. If they vanished unexpectedly across the board, raise an incident.")
T(['portal slow on mobile','mobile portal slow','portal lag on phone','slow on phone'],
  "If the portal is slow on your phone, check your mobile connection, close other apps, and try the dedicated mobile app for a faster, app-like experience. Persistent slowness for many users is a platform issue worth raising with details of your device and network.")
T(['mfa backup codes','recovery codes','backup authentication','lost mfa access','mfa recovery'],
  "Generate and safely store MFA backup or recovery codes from your security settings so you can sign in if you lose your primary device. Treat them like passwords. If you have no codes and lose access, contact IT Support to verify your identity and reset MFA.")
T(['security policy','acceptable use','it policy','usage policy','security rules'],
  "Acceptable use and security policies define how to use systems and handle data responsibly. Find them in the knowledge base or your policy portal, and follow them in daily work. If a task seems to conflict with policy, pause and check with the security team before proceeding.")
T(['expense rejected','expense query','expense not paid','reimbursement delay','expense status'],
  "If an expense was rejected or delayed, read the approver's or finance team's comments for the reason, correct it, and resubmit per the expense policy. For payment timing, check the finance schedule. Raise an HR or finance request if the status is unclear.")
T(['training overdue','mandatory training','complete training','training deadline','assigned course'],
  "Complete assigned and mandatory training by its deadline in the learning system to stay compliant. Overdue training may be escalated to your manager. If you cannot access a course or the deadline is unrealistic, raise an HR or learning request to resolve it.")
T(['vpn setup','install vpn','configure vpn','first time vpn','get vpn access'],
  "To get VPN access, request it through the Service Catalog, then install and configure the approved client per the provided guide, signing in with your credentials and MFA. If you already have access but it will not connect, say \"VPN not connecting\" for troubleshooting steps.")
T(['wifi setup','connect to office wifi','corporate wifi','join wifi','wireless setup'],
  "To join the corporate Wi-Fi, select the official network and authenticate with your work credentials or a provided certificate, following the setup guide for your device. For guest access, use the guest network. If you cannot connect, raise an incident with your device and location.")
T(['new phone setup','set up work phone','mobile device setup','enroll device','byod setup'],
  "Setting up a work or personal device for company use usually involves enrolling it in mobile management and installing required apps, following the provided guide. Request enrolment through the catalog if needed. Enrolment applies security policy to protect company data on the device.")
T(['account expiry','password about to expire','password expiry warning','renew password','expiring credentials'],
  "If your password is about to expire, change it proactively from your security settings or at the next sign-in prompt, choosing a strong, unique password. Doing it before expiry avoids a lockout. If it has already expired, use self-service reset or contact IT Support.")
T(['shared mailbox','team mailbox','access shared mailbox','group mailbox','functional mailbox'],
  "Shared and team mailboxes let several people manage a common address. To get access, raise a request naming the mailbox and the level of access needed, which routes for the owner's approval. Once granted, add the mailbox in your mail application.")
T(['guest access','external user','contractor access','partner access','third party login'],
  "Granting access to a guest, contractor, or partner follows a governed process with sponsorship and approval, scoped to the minimum needed and time-limited where possible. Raise a request specifying who needs access, to what, and for how long, and it will route for approval.")
T(['archived ticket','old request','closed long ago','find historical ticket','past tickets'],
  "To find an old or archived ticket, search the relevant list by number, requester, or date range, including closed records. Your history view also holds recently opened items. If a very old record is not visible, retention or archiving may apply; ask the service desk.")
T(['bulk request','order for whole team','many users request','team onboarding request','mass provisioning'],
  "To equip a whole team, use an order guide if one exists, or raise a request listing each person and what they need, since bulk provisioning often needs coordination. The service desk can advise the most efficient path for larger onboarding or rollouts.")
T(['recurring meeting issue','meeting room booking failed','resource booking','book equipment','reserve a room'],
  "Book rooms and shared resources through the calendar's room or resource feature, checking availability before sending the invite. If a booking fails or a room is double-booked, the resource may be misconfigured; raise a request naming the room so it can be corrected.")
T(['license request','software entitlement','need a license','assign license','request software license'],
  "To get a software licence, request the application through the catalog, which checks entitlement and assigns a licence as part of fulfilment. If you already have the software but lack a licence, raise a request naming the product so a licence can be allocated.")
T(['decommission request','remove a server','retire application','shut down service','sunset system'],
  "Decommissioning a system is a controlled change: confirm it is unused, update dependent CIs and relationships, communicate to stakeholders, and execute within a window with a back-out option. Raise a change to plan it, and update the CMDB to retire the CIs afterwards.")

# ============ SUPPLEMENT (ensure 500+) ============
T(['service request status meaning','request stages explained','what stage is my request','request state meaning'],
  "Requests progress through stages such as Submitted, Approval, Fulfilment, and Closed Complete. Each requested item can be at a different stage. Open your request at /sp?id=requests to see the current stage and any pending step. Say \"Show my requests\" and I will list them.")
T(['incident worklog','log activity on incident','record actions','document work done'],
  "Record what you do on an incident in work notes as you go, so the activity log captures diagnosis, actions, and decisions with timestamps. Good worklogs make handovers smooth and speed future diagnosis of similar issues. Use customer comments to keep the user updated.")
T(['change advisory roles','cab members','who sits on cab','change board roles'],
  "CAB members typically include the change manager, service owners, technical leads, and representatives for risk and security as needed. Each assesses the change from their perspective. Provide a complete plan and risk assessment so the board can decide efficiently.")
T(['problem workaround communication','share workaround','publish workaround','tell users workaround'],
  "When a workaround exists, document it on the problem and the known error, and ensure the service desk can apply it to matching incidents. Where appropriate, publish a knowledge article so affected users can self-serve until the permanent fix is deployed.")
T(['knowledge categories management','reorganize kb','kb taxonomy','knowledge structure change'],
  "Reorganising knowledge categories and bases is a governance task owned by knowledge managers, balancing findability with maintainability. If the current structure makes articles hard to find, suggest improvements through the feedback channel with examples of what you struggled to locate.")
T(['sla notification recipients','who gets sla alerts','sla warning recipients','breach notification'],
  "SLA warning and breach notifications typically go to the assignee, the assignment group, and its manager so action is taken before or right after a target is missed. If the wrong people are notified, the SLA or notification configuration needs an administrator's review.")
T(['cmdb import','load cis','bulk add cis','import configuration items','ci data load'],
  "Bulk-loading CIs uses import sets and transform maps with coalesce fields to update rather than duplicate existing records. Validate a sample first and follow naming and class standards. Where possible, prefer discovery so CIs and relationships stay current automatically.")
T(['account merge','duplicate user account','merge users','two accounts same person'],
  "If a person has duplicate accounts, do not simply delete one, as history is attached to each. Raise a request so the identity team can reconcile or merge them correctly, keeping the authoritative account and preserving records. Future duplicates are best prevented at the source directory.")
T(['approval reassignment audit','track delegated approvals','delegation history','who approved via delegate'],
  "When a delegate approves on someone's behalf, the approval history records both the delegate and the original approver, preserving accountability. Review the approval trail on the request to see exactly who acted and under what delegation. This is the authoritative audit record.")
T(['notification testing','test a notification','preview notification','send test email'],
  "Testing a notification is an administrative task: an admin can preview the template and send a test to confirm content and recipients before enabling it broadly. If a notification's wording or audience is wrong, request the change so it can be edited and re-tested.")
T(['report ownership transfer','change report owner','transfer report','reassign report'],
  "If a report owner leaves or changes role, ownership should transfer so the report stays maintained and shareable. Ask an administrator to reassign ownership, or recreate the report under a current owner. Unowned reports risk going stale, so keep ownership current.")
T(['list export limits','export too large','cannot export all rows','export row limit'],
  "Very large list exports may be capped for performance. If your export is truncated, tighten the filter to the rows you actually need, or use a scheduled report for large datasets. For bulk extracts, ask an administrator about the appropriate, supported method.")
T(['portal accessibility','portal screen reader','accessible portal','portal high contrast'],
  "The Service Portal supports accessibility, including screen-reader compatibility, keyboard navigation, and high-contrast options. Enable the settings you need in your preferences. If you encounter a barrier in the portal, raise an incident describing it so it can be fixed.")
T(['mobile sync issue','mobile not updating','app out of date','mobile refresh','app not syncing'],
  "If the mobile app shows stale data, pull to refresh, confirm you are online, and ensure the app is updated to the latest version. Signing out and back in can clear a stuck session. If data still will not sync, raise an incident noting the app version and device.")
T(['scope conflict','cross scope access','scope error','application access error'],
  "Cross-scope access is governed explicitly, so an application in one scope cannot freely touch another's tables or scripts without permission. A scope error usually means the access is not granted by design. This is a developer and administrator concern, raised as a configuration request.")
T(['operations intelligence help','oi how to','how do i use operations intelligence','oi getting started','oi guide'],
  "To get started in Operations Intelligence, open the Workspace to run automations, the Operations Gallery to view deliverables, and, if you have the role, Studio to build them, Governance to approve, and Command to administer. Ask me about any section or say \"help\" for the menu.")
T(['operations intelligence support','oi issue','problem with this portal','oi not working','report oi problem'],
  "If something in Operations Intelligence is not working, note what you were doing and any error, then contact your platform administrator, who oversees the engine and configuration. For broader IT issues unrelated to this portal, say \"Create an incident\" and I will guide you.")
T(['execution details','open an execution','view execution','execution record','inspect run'],
  "To inspect a run, open its execution record to see the automation, status, who triggered it, the timestamps, and any output or error detail. Say \"Show recent executions\" and I will list your latest runs so you can identify the one you want to examine.")
T(['group automations','automations for my group','what can my group run','group automation list'],
  "The automations available to you come from the groups you belong to. Say \"Show my automations\" to list them with their owning groups, or \"What groups am I in?\" to see your memberships. To gain access to more, contact the group owner or your administrator.")
T(['role request oi','request creator role','request leadership role','get oi role','elevate oi access'],
  "Operations Intelligence access is granted through roles and group membership managed by administrators in Governance or Command. To request the Creator, Leadership, or another role, contact your administrator with the business reason, and they can enrol you appropriately.")
T(['data classification handling','handle confidential data','restricted data rules','data handling'],
  "Handle each data class per policy, applying the strongest controls to confidential and restricted data: limit access, use approved channels, and avoid exposing it in exports, screenshots, or messages. When unsure of a data item's classification, treat it as sensitive and check.")
T(['secure printing','confidential print','print release','badge to print','follow me print'],
  "Where secure printing is in place, your job holds at the printer until you release it with your badge or PIN, protecting confidential documents from sitting in the tray. If a print job will not release, check you are at an enabled printer and raise an incident if it fails.")
T(['benefits enrollment deadline','open enrollment','enroll benefits deadline','benefits window'],
  "Benefits changes are usually made during an open-enrolment window or after a qualifying life event. Watch for the enrolment deadline in the HR portal and make your selections in time. For changes outside the window, raise an HR request explaining the qualifying event.")
T(['payslip access','where is my payslip','download payslip','view pay statement'],
  "Access your payslips in the HR or payroll self-service portal, where you can view and download recent statements. If a payslip is missing or looks wrong, raise a confidential payroll request so a specialist can review it. Avoid sharing pay details over insecure channels.")
T(['device replacement','replace broken laptop','faulty device','swap equipment','device exchange'],
  "If a work device is faulty, raise a request or incident describing the fault so IT can repair or replace it, and ask about a loaner if you need cover meanwhile. Back up your data to approved storage first where possible, and return the faulty device as instructed.")
T(['data backup','back up my files','where to save files','file backup','protect my data'],
  "Save work files to approved cloud or network storage rather than only on your device, so they are backed up and accessible if your device fails. Local files may not be recoverable. If you are unsure where to store something, check the data-handling guidance or ask IT.")
T(['guest wifi','visitor wifi','wifi for guests','temporary wifi','event wifi'],
  "Guests connect using the guest Wi-Fi network, which is separate from the corporate network and may require a code or sponsor. For visitors needing more than basic internet, raise a request in advance. Keep corporate credentials off guest networks.")
T(['conference room tech','meeting room equipment','room screen not working','av in meeting room','room booking tech'],
  "If meeting-room technology such as the screen, camera, or conferencing system is not working, try the room's quick-start guide and a cable reseat, then use the room support contact if provided. Raise an incident naming the room and the fault so it is fixed before the next booking.")
T(['software uninstall','remove software','uninstall application','clean up apps','remove program'],
  "To remove software safely, use the approved software portal or request removal so licences are reclaimed and dependencies are respected, rather than deleting files manually. If an application must go for security or licensing reasons, raise a request naming it.")
T(['printer toner','replace toner','out of ink','printer consumables','order toner'],
  "When a printer is low on toner or ink, request the consumable through the catalog or notify the team that manages that printer, quoting the printer model so the correct cartridge is ordered. For shared printers, facilities or IT usually maintain a stock.")

# ============ CLOSING SUPPLEMENT ============
T(['facilities request','building issue','office maintenance','desk move','facilities help','heating cooling'],
  "For facilities matters such as a building fault, desk move, or environment issue, raise a facilities request in the catalog describing the location and the problem. For anything unsafe, follow your site's safety reporting first, then log the request so it is tracked.")
T(['parking','car park access','parking permit','reserve parking','parking request'],
  "Parking access and permits are usually arranged through a facilities or HR request, specifying your site and the dates needed. Availability can be limited, so request in advance. For visitor parking, raise the request ahead of the visit with the details.")
T(['building access','door access','badge access','access card not working','enter building'],
  "Building and door access is tied to your badge. If your badge will not open a door you should reach, raise a request naming the location so access can be granted, or contact site security for immediate help. Report a lost badge promptly so it can be disabled.")
T(['catering','event catering','book catering','refreshments','meeting catering'],
  "Arrange catering or refreshments for a meeting or event through the relevant facilities or catering request, giving the date, headcount, and any dietary requirements with enough notice. Confirm budget approval where needed before booking.")
T(['stationery','office supplies','order supplies','desk supplies','stationery request'],
  "Order stationery and office supplies through the catalog or your team's supplies process, listing the items and quantity. For shared-area supplies, notify the team that manages them. Keep requests reasonable and grouped to streamline fulfilment.")
T(['health and safety','report a hazard','safety concern','accident report','first aid'],
  "For a safety hazard or incident, follow your site's health-and-safety reporting process first, especially for anything urgent or involving injury, then log a record so it is tracked. Know your nearest first-aider and exits. Treat genuine emergencies with the appropriate emergency services.")
T(['visitor','register a visitor','guest arriving','book a visitor','sign in visitor'],
  "Register expected visitors in advance through the visitor or reception process, giving their name, company, and arrival time so passes and access are ready. Meet your visitor at reception and follow escort rules. Pre-registration speeds their arrival and keeps the site secure.")
T(['accessibility request','workplace adjustment','reasonable adjustment','accommodation request','assistive technology'],
  "If you need a workplace adjustment or assistive technology, raise a confidential HR or IT request describing your needs so the right support can be arranged. These requests are handled sensitively. Your manager and HR can help ensure you have what you need to work effectively.")
T(['survey','feedback survey','complete survey','satisfaction survey','rate service'],
  "After a request or incident closes, you may receive a short satisfaction survey. Completing it helps teams understand what is working and where to improve. Be specific in any comments so the feedback is actionable, and flag anything that needs follow-up.")
T(['who do i contact','right team','where to go','point of contact','responsible contact'],
  "If you are unsure who to contact, describe what you need and I will point you to the right path, whether that is a catalog item, an incident, an HR request, or the service desk. For services, the owning team is recorded in the CMDB, and the service desk can always route you.")

PREAMBLE = r'''    if (input.action === 'assistant_query') {
        var rawQ = '' + (input.query || '');
        var aq   = rawQ.toLowerCase().trim();

        if (!aq) {
            data.reply = 'Please enter a question or command.';
            data.type  = 'info';
            return;
        }

        function containsAny(str, words) {
            var wi;
            for (wi = 0; wi < words.length; wi++) {
                if (str.indexOf(words[wi]) !== -1) { return true; }
            }
            return false;
        }

        function stripStopWords(str) {
            var stops = ['i','me','my','myself','we','our','ours','ourselves','you','your','yours',
                'the','a','an','and','but','or','for','nor','on','at','to','from','by','with',
                'that','this','these','those','is','are','was','were','be','been','being',
                'have','has','had','do','does','did','will','would','shall','should',
                'may','might','must','can','could','about','of','in','it','its',
                'if','as','up','out','so','also','all','any','just','not','no','get','show','find',
                'please','want','need','tell','give','let','know','see','check','look'];
            var words = str.split(/\s+/);
            var filtered = [];
            var swi;
            for (swi = 0; swi < words.length; swi++) {
                if (stops.indexOf(words[swi]) === -1 && words[swi].length > 1) { filtered.push(words[swi]); }
            }
            return filtered.join(' ');
        }

        function extractIncidentNumber(str) {
            var match = str.match(/\binc\d{7}\b/i);
            return match ? match[0].toUpperCase() : null;
        }

        function matchTopic(aqStr, topicsArray) {
            var ti;
            for (ti = 0; ti < topicsArray.length; ti++) {
                if (containsAny(aqStr, topicsArray[ti].k)) {
                    return topicsArray[ti];
                }
            }
            return null;
        }

'''

def js_str(s):
    s = s.replace('\\', '\\\\').replace("'", "\\'").replace('\n', '\\n')
    return "'" + s + "'"

def emit_topics():
    lines = []
    lines.append("        var TOPICS = [")
    for idx, (keys, reply) in enumerate(TOPICS):
        kparts = ", ".join(js_str(k) for k in keys)
        comma = "," if idx < len(TOPICS) - 1 else ""
        lines.append("            { k: [" + kparts + "], r: " + js_str(reply) + " }" + comma)
    lines.append("        ];")
    return "\n".join(lines)

# Dynamic handlers block (handlers 1-18) reused/adapted from existing logic
DYNAMIC = r'''
        if (containsAny(aq, ['hello','hi there','hey there','good morning','good afternoon','good evening','howdy','greetings','whats up','yo ','hi ','hey ']) || aq === 'hi' || aq === 'hey' || aq === 'hello') {
            var greetHour = parseInt(gs.nowDateTime().substring(11, 13), 10);
            if (isNaN(greetHour)) { greetHour = 9; }
            var greetTime = greetHour < 12 ? 'Good morning' : greetHour < 17 ? 'Good afternoon' : 'Good evening';
            data.reply = greetTime + '! I am your Operations Assistant. I can help you with:\n\n' +
                '- Service requests and catalog items\n' +
                '- Incidents, problems, and changes\n' +
                '- Approvals and governance actions\n' +
                '- Knowledge base articles\n' +
                '- Automations and executions\n' +
                '- Groups, teams, and memberships\n\n' +
                'What would you like to do today? Type "help" for a full list of capabilities.';
            data.type = 'info';
            return;
        }

        if (containsAny(aq, ['thank you','thanks','thank u','appreciate','great job','well done','that helped','that works','sorted','resolved it','cheers'])) {
            data.reply = 'You are welcome! Is there anything else I can help you with?';
            data.type  = 'info';
            return;
        }

        if (containsAny(aq, ['help','what can you','what can i','capabilities','commands','guide me','assist me','how to use you','what do you do','list commands','show commands'])) {
            var isAdminUser = (hasAdmin === true);
            data.reply = 'I am your Operations Assistant. Here is what I can help you with:\n\n' +
                'Service Requests:\n' +
                '- "Show my requests" — view your open service requests\n' +
                '- "I need a new laptop" — search and submit catalog items\n' +
                '- "Request VPN access" — find access request catalog items\n\n' +
                'Incidents:\n' +
                '- "Show my incidents" — list your open incidents\n' +
                '- "Create an incident" — report a new issue to IT\n' +
                '- "Check INC0001234" — look up a specific incident\n\n' +
                'Approvals:\n' +
                '- "Show my approvals" — view requests waiting for your approval\n\n' +
                'Knowledge Base:\n' +
                '- "How do I reset my password?" — find how-to articles\n' +
                '- "What is the change process?" — search documentation\n\n' +
                'Automations:\n' +
                '- "Show my automations" — list available automations\n' +
                '- "Run [automation name]" — trigger an automation\n' +
                '- "Show recent executions" — view activity history\n\n' +
                'Account & Profile:\n' +
                '- "Who am I?" — show your profile information\n' +
                '- "What groups am I in?" — list your group memberships\n\n' +
                (isAdminUser ? 'Administration (admin only):\n' +
                '- "Create a report" — create a managed report\n' +
                '- "Create a dashboard" — create a managed dashboard\n' +
                '- "Service health" — check system status\n\n' : '') +
                'You can also ask me about incidents, problems, changes, SLAs, the CMDB, knowledge, security, HR services, and common IT issues. Type a question and I will help.';
            data.type  = 'info';
            return;
        }

        if (containsAny(aq, ['my profile','who am i','my account','my details','my information','about me','my user record'])) {
            var profRec = new GlideRecord('sys_user');
            var profName = 'Unknown', profEmail = '', profDept = '', profTitle = '';
            if (profRec.get(userSysId)) {
                profName  = '' + profRec.getDisplayValue('name');
                profEmail = '' + (profRec.getValue('email') || '');
                profDept  = '' + (profRec.getDisplayValue('department') || '');
                profTitle = '' + (profRec.getValue('title') || '');
            }
            var roleList = [];
            if (hasAdmin)      { roleList.push('Administrator'); }
            if (hasLeadership) { roleList.push('Leadership'); }
            if (hasCreator)    { roleList.push('Creator'); }
            if (hasUser)       { roleList.push('User'); }
            data.reply = 'Your Profile:\n\n' +
                'Name: ' + profName + '\n' +
                (profEmail ? 'Email: ' + profEmail + '\n' : '') +
                (profTitle ? 'Title: ' + profTitle + '\n' : '') +
                (profDept  ? 'Department: ' + profDept + '\n' : '') +
                'Roles: ' + (roleList.length ? roleList.join(', ') : 'None assigned') + '\n' +
                'Groups: ' + (data.userGroups.length ? data.userGroups.length + ' group' + (data.userGroups.length === 1 ? '' : 's') : 'None');
            data.type = 'info';
            return;
        }

        if (containsAny(aq, ['my incident','my incidents','my issues','open incident','incidents i raised','incident list','show incidents','view incidents','my open ticket','my open tickets','active incident'])) {
            var myIncItems = loadUserIncidents(userSysId, 10);
            if (myIncItems.length === 0) {
                data.reply = 'You have no active incidents. If you are experiencing an issue, say "Create an incident" to report it to IT.';
                data.type  = 'info';
            } else {
                data.reply = 'You have ' + myIncItems.length + ' active incident' + (myIncItems.length === 1 ? '' : 's') + '. Click any item to view details:';
                data.type  = 'requests';
                data.items = myIncItems;
            }
            return;
        }

        var incNum = extractIncidentNumber(aq);
        if (incNum) {
            var incLookupGr = new GlideRecord('incident');
            incLookupGr.addQuery('number', incNum);
            incLookupGr.setLimit(1);
            incLookupGr.query();
            if (incLookupGr.next()) {
                var incState    = '' + incLookupGr.getDisplayValue('state');
                var incPriority = '' + incLookupGr.getDisplayValue('priority');
                var incDesc     = '' + (incLookupGr.getValue('short_description') || '');
                var incAssigned = '' + (incLookupGr.getDisplayValue('assigned_to') || 'Unassigned');
                var incUpdated  = '' + incLookupGr.getDisplayValue('sys_updated_on');
                data.reply = 'Incident ' + incNum + ':\n\n' +
                    'Description: ' + (incDesc || 'No description') + '\n' +
                    'State: ' + incState + '\n' +
                    'Priority: ' + incPriority + '\n' +
                    'Assigned to: ' + incAssigned + '\n' +
                    'Last updated: ' + incUpdated + '\n\n' +
                    'Click here to view the full incident: /sp?id=ticket&table=incident&sys_id=' + incLookupGr.getUniqueValue();
                data.type = 'info';
            } else {
                data.reply = 'Incident ' + incNum + ' was not found. Please verify the number and try again.';
                data.type  = 'error';
            }
            return;
        }

        if (containsAny(aq, ['create incident','report incident','log incident','raise incident','new incident','file incident','submit incident','report an issue','log an issue','report issue','create a ticket','raise a ticket','open a ticket','log a ticket','something is broken','not working','server down','system down','i have an issue','i have a problem','technical issue','technical problem'])) {
            var incKbItems = searchKnowledge(stripStopWords(aq) || aq, 3);
            data.reply = 'To report an incident with IT, go to the Service Portal and select "Report an Issue" or click here: /sp?id=new_call\n\n' +
                'When creating your incident, please include:\n' +
                '- A clear description of the issue\n' +
                '- When it started\n' +
                '- How many people are affected\n' +
                '- Any error messages you see\n\n' +
                'For emergencies or critical outages, call the IT helpdesk directly.';
            if (incKbItems.length > 0) {
                data.reply += '\n\nI also found knowledge articles that may resolve your issue:';
                data.type  = 'knowledge';
                data.items = incKbItems;
            } else {
                data.type = 'info';
            }
            return;
        }

        if (containsAny(aq, ['my approval','my approvals','pending approval','waiting for my approval','items to approve','need to approve','approval queue','approval list','show approvals','view approvals','what needs approval','awaiting approval'])) {
            var myApprovals = loadUserApprovals(userSysId, 10);
            if (myApprovals.length === 0) {
                data.reply = 'You have no pending approvals at this time. You will be notified when requests require your approval.';
                data.type  = 'info';
            } else {
                data.reply = 'You have ' + myApprovals.length + ' pending approval' + (myApprovals.length === 1 ? '' : 's') + ' waiting for your action:';
                data.type  = 'requests';
                data.items = myApprovals;
            }
            return;
        }

        if (containsAny(aq, ['change request','change ticket','schedule a change','raise a change','create a change','change order','request a change'])) {
            var changeKbItems = searchKnowledge('change management process', 4);
            data.reply = 'To submit a Change Request, navigate to the Service Catalog and search for "Change Request" or speak with your Change Manager.\n\n' +
                'Change types available:\n' +
                '- Standard Change: Pre-approved, low-risk, repeatable\n' +
                '- Normal Change: Requires Change Advisory Board (CAB) review\n' +
                '- Emergency Change: Expedited for critical issues\n\n' +
                'You can submit a change at: /sp?id=sc_cat_item&sysparm_category=change';
            if (changeKbItems.length > 0) {
                data.reply += '\n\nRelated knowledge articles:';
                data.type  = 'knowledge';
                data.items = changeKbItems;
            } else {
                data.type = 'info';
            }
            return;
        }

        if (containsAny(aq, ['reset my password','forgot my password','password expired','change my password','password reset','locked out','account locked','cannot log in','cant log in','login problem','unlock account','unlock my account','need a new password','i am locked out'])) {
            var pwKbItems = searchKnowledge('password reset', 4);
            data.reply = 'Password and account help:\n\n' +
                '1. Self-service password reset: /sp?id=self_service_pw_reset\n' +
                '2. If your account is locked, wait 15 minutes and try again, or contact IT Support\n' +
                '3. For Active Directory password resets, use the company self-service portal\n\n' +
                'IT Support contact: Raise a service request for "Account Access" in the Service Catalog, or call the helpdesk for immediate assistance.';
            if (pwKbItems.length > 0) {
                data.reply += '\n\nKnowledge articles on password management:';
                data.type  = 'knowledge';
                data.items = pwKbItems;
            } else {
                data.type = 'info';
            }
            return;
        }

        if (containsAny(aq, ['outage','service down','system outage','is down','not available','service unavailable','service status','system status','health check','service health','platform status','what is down','whats down','current outage','known issue','known issues','planned maintenance'])) {
            var outageSysItems = [];
            try {
                var outageGr = new GlideRecord('cmdb_ci_outage');
                outageGr.addQuery('active', true);
                outageGr.orderByDesc('begin');
                outageGr.setLimit(5);
                outageGr.query();
                while (outageGr.next()) {
                    outageSysItems.push('- ' + ('' + outageGr.getDisplayValue('configuration_item')) + ': ' + ('' + outageGr.getValue('type')) + ' since ' + ('' + outageGr.getDisplayValue('begin')));
                }
            } catch (oe) { outageSysItems = []; }
            if (outageSysItems.length > 0) {
                data.reply = 'Current active outages:\n\n' + outageSysItems.join('\n') + '\n\nFor real-time status updates, contact the IT service desk or check the company status page.';
            } else {
                data.reply = 'No active outages are currently recorded in the system. If you are experiencing an issue, please report it as an incident using "Create an incident" or contact IT Support directly.';
            }
            data.type = 'info';
            return;
        }

        if (containsAny(aq, ['my request','my requests','my tickets','my orders','requests i raised','what did i request','show requests','view requests','open request','raised request','submitted request'])) {
            var reqItems = loadUserRequests(userSysId, 20);
            if (reqItems.length === 0) {
                data.reply = 'You have not raised any service requests yet. Use the Service Catalog to submit requests for equipment, access, or services. Try asking "I need a laptop" to get started.';
                data.type  = 'info';
            } else {
                data.reply = 'Here are your service requests. Click any item to open it in the Service Portal:';
                data.type  = 'requests';
                data.items = reqItems;
            }
            return;
        }

        if (containsAny(aq, ['my group','groups i','which group','what group','am i in','member of','my team','my membership','team member','group member','my teams'])) {
            if (data.userGroups.length === 0) {
                data.reply = 'You are not a member of any Operations Intelligence groups. Contact your administrator to be added to a group.';
            } else {
                var gLines = [];
                var gni;
                for (gni = 0; gni < data.userGroups.length; gni++) {
                    gLines.push('- ' + data.userGroups[gni].name + ' (' + (data.userGroups[gni].role || 'user') + ')');
                }
                data.reply = 'You are a member of ' + data.userGroups.length + ' group' + (data.userGroups.length === 1 ? '' : 's') + ':\n\n' + gLines.join('\n');
            }
            data.type = 'info';
            return;
        }

        if (containsAny(aq, ['last execution','recent execution','what ran','did it run','execution log','my execution','execution status','automation history','automation log','recent executions','show executions'])) {
            var seItems = [];
            if (data.personSysId) {
                var seGr = new GlideRecord('x_infte_ops_int_execution');
                seGr.addQuery('triggered_by', data.personSysId);
                seGr.orderByDesc('triggered_at');
                seGr.setLimit(5);
                seGr.query();
                while (seGr.next()) {
                    seItems.push((seItems.length + 1) + '. ' + ('' + seGr.getDisplayValue('automation')) + ' — ' + ('' + seGr.getValue('status')) + ' (' + ('' + seGr.getDisplayValue('triggered_at')) + ')');
                }
            }
            if (seItems.length === 0) {
                data.reply = 'You have no recent automation executions. Trigger an automation from the Workspace to get started.';
            } else {
                data.reply = 'Your most recent automation executions:\n\n' + seItems.join('\n');
            }
            data.type = 'info';
            return;
        }

        if (containsAny(aq, ['list automation','show automation','my automation','what automation','available automation','automations available','show me automation','what automations','which automations','all automations'])) {
            var listWs = loadWorkspace(data.userGroups);
            if (listWs.automations.length === 0) {
                data.reply = 'You have no automations available. Contact your administrator to be added to a group with published automations.';
            } else {
                var aLines = [];
                var ali;
                for (ali = 0; ali < listWs.automations.length; ali++) {
                    var aa = listWs.automations[ali];
                    aLines.push('- ' + aa.name + (aa.short_description ? ': ' + aa.short_description : '') + ' [Group: ' + (aa.owner_group || 'Not assigned') + ']');
                }
                data.reply = 'You have ' + listWs.automations.length + ' automation' + (listWs.automations.length === 1 ? '' : 's') + ' available:\n\n' + aLines.join('\n') + '\n\nTo trigger one, say "Run [automation name]".';
            }
            data.type = 'info';
            return;
        }

        if (containsAny(aq, ['run ','trigger ','execute ','launch ','fire ','start automation','kick off','initiate automation'])) {
            var runWs = loadWorkspace(data.userGroups);
            if (runWs.automations.length === 0) {
                data.reply = 'You have no automations available to run. Contact your administrator.';
                data.type  = 'info';
                return;
            }
            var targetAuto = null;
            var rni;
            for (rni = 0; rni < runWs.automations.length; rni++) {
                var rAutoName = (runWs.automations[rni].name || '').toLowerCase();
                if (rAutoName && aq.indexOf(rAutoName) !== -1) {
                    targetAuto = runWs.automations[rni];
                    break;
                }
            }
            if (!targetAuto) {
                var autoNames = [];
                var ani;
                for (ani = 0; ani < runWs.automations.length; ani++) { autoNames.push('"' + runWs.automations[ani].name + '"'); }
                data.reply = 'Which automation would you like to run? Available: ' + autoNames.join(', ') + '.\n\nExample: "Run ' + (runWs.automations[0] ? runWs.automations[0].name : 'automation name') + '"';
                data.type  = 'info';
                return;
            }
            try {
                var runEngine = new ExecutionEngine();
                var runExecId = runEngine.createExecution(targetAuto.sys_id, {}, targetAuto.owner_group_sys_id);
                if (runExecId) {
                    var runExecRec = new GlideRecord('x_infte_ops_int_execution');
                    if (runExecRec.get(runExecId)) {
                        data.reply = 'Automation "' + targetAuto.name + '" triggered successfully.\nExecution: ' + ('' + runExecRec.getValue('number')) + '\nStatus: ' + ('' + runExecRec.getValue('status'));
                    } else {
                        data.reply = 'Automation "' + targetAuto.name + '" triggered successfully.';
                    }
                    data.type = 'success';
                } else {
                    data.reply = 'Failed to trigger "' + targetAuto.name + '". Please try again from the Workspace.';
                    data.type  = 'error';
                }
            } catch (runErr) {
                data.reply = 'Error triggering "' + targetAuto.name + '": ' + runErr;
                data.type  = 'error';
            }
            return;
        }

        if (containsAny(aq, ['create report','build report','new report','make report','generate report','report builder'])) {
            if (!hasCreator && !hasAdmin) {
                data.reply = 'Report creation requires Creator or Administrator access. Contact your administrator to request the Creator role.';
                data.type  = 'error';
            } else {
                data.reply = 'To create a new report, navigate to the Studio section from the sidebar and select "Report" as your deliverable type. The report builder will guide you through naming and configuring your report.\n\nYour completed reports will appear in the Operations Gallery.';
                data.type  = 'info';
            }
            return;
        }

        if (containsAny(aq, ['create dashboard','build dashboard','new dashboard','make dashboard','generate dashboard','dashboard builder'])) {
            if (!hasCreator && !hasAdmin) {
                data.reply = 'Dashboard creation requires Creator or Administrator access. Contact your administrator to request the Creator role.';
                data.type  = 'error';
            } else {
                data.reply = 'To create a new dashboard, navigate to the Studio section from the sidebar and select "Dashboard" as your deliverable type. The dashboard builder will guide you through the configuration.\n\nYour completed dashboards will appear in the Operations Gallery.';
                data.type  = 'info';
            }
            return;
        }

        if (containsAny(aq, ['i need','i want','request a','order a','order an','get a','get an','need a','need an','request access','can i get','can i have','buy a','purchase','procure','submit a request','raise a request'])) {
            var catSearchQ1 = stripStopWords(aq);
            if (!catSearchQ1) { catSearchQ1 = aq; }
            var catItems1 = searchCatalog(catSearchQ1, 6);
            if (catItems1.length === 0 && catSearchQ1 !== aq) { catItems1 = searchCatalog(aq, 6); }
            if (catItems1.length === 0) {
                data.reply = 'I could not find matching catalog items for "' + rawQ + '". Try browsing the Service Catalog at /sp?id=sc_home or rephrase with the specific item name.';
                data.type  = 'info';
            } else {
                data.reply = 'I found ' + catItems1.length + ' catalog item' + (catItems1.length === 1 ? '' : 's') + ' matching your request. Click to open and submit:';
                data.type  = 'catalog';
                data.items = catItems1;
            }
            return;
        }

        if (containsAny(aq, ['laptop','desktop computer','mobile phone','equipment request','vpn access','software request','software license','new application','hardware request','printer request','new monitor','docking station','headset','access badge','remote access','tablet','docking','webcam request'])) {
            var catSearchQ2 = stripStopWords(aq);
            if (!catSearchQ2) { catSearchQ2 = aq; }
            var catItems2 = searchCatalog(catSearchQ2, 6);
            if (catItems2.length === 0 && catSearchQ2 !== aq) { catItems2 = searchCatalog(aq, 6); }
            if (catItems2.length === 0) {
                data.reply = 'I could not find a catalog item matching "' + rawQ + '". Contact the service desk or browse the Service Catalog at /sp?id=sc_home.';
                data.type  = 'info';
            } else {
                data.reply = 'Here are catalog items related to your request. Click to open and submit:';
                data.type  = 'catalog';
                data.items = catItems2;
            }
            return;
        }

        var matchedTopic = matchTopic(aq, TOPICS);
        if (matchedTopic) {
            data.reply = matchedTopic.r;
            data.type  = 'info';
            return;
        }

        if (containsAny(aq, ['how do','how to','what is','what are','explain','procedure','process','policy','knowledge','learn','find information','find out','troubleshoot','problem with','issue with','error with','help with','documentation','steps to','instructions','tutorial','article','faq','guide for','understand','show me how','tell me about','what does'])) {
            var kbSearchQ = stripStopWords(aq);
            if (!kbSearchQ) { kbSearchQ = aq; }
            var kbItems = searchKnowledge(kbSearchQ, 6);
            if (kbItems.length === 0 && kbSearchQ !== aq) { kbItems = searchKnowledge(aq, 6); }
            if (kbItems.length === 0) {
                data.reply = 'I could not find knowledge articles matching "' + rawQ + '". Try rephrasing your question, browse the Knowledge Base at /sp?id=kb_home, or contact the service desk for direct assistance.';
                data.type  = 'info';
            } else {
                data.reply = 'I found ' + kbItems.length + ' knowledge article' + (kbItems.length === 1 ? '' : 's') + ' that may help:';
                data.type  = 'knowledge';
                data.items = kbItems;
            }
            return;
        }

        var fbQ = stripStopWords(aq);
        var fbCatItems = fbQ ? searchCatalog(fbQ, 3) : [];
        var fbKbItems  = fbQ ? searchKnowledge(fbQ, 3) : [];

        if (fbCatItems.length > 0 || fbKbItems.length > 0) {
            data.reply = 'I found some resources that might help with "' + rawQ + '":';
            if (fbCatItems.length > 0 && fbKbItems.length > 0) {
                data.type  = 'catalog';
                data.items = fbCatItems.concat(fbKbItems);
            } else if (fbCatItems.length > 0) {
                data.type  = 'catalog';
                data.items = fbCatItems;
            } else {
                data.type  = 'knowledge';
                data.items = fbKbItems;
            }
            return;
        }

        data.reply = 'I am not sure how to help with "' + rawQ + '". You can try:\n\n' +
            '- "Show my incidents" — view your active incidents\n' +
            '- "Show my approvals" — view pending approvals\n' +
            '- "I need a laptop" — search the Service Catalog\n' +
            '- "How do I reset my password?" — search the Knowledge Base\n' +
            '- "Show my automations" — list available automations\n' +
            '- "Contact support" — reach IT support\n\n' +
            'Type "help" for all capabilities.';
        data.type  = 'info';
        return;
    }'''

block = PREAMBLE + emit_topics() + "\n" + DYNAMIC + "\n"

with io.open('/home/user/ServiceNow-Solutions/.generated_assistant_block.js', 'w', encoding='utf-8') as f:
    f.write(block)

print("TOPIC_COUNT", len(TOPICS))
print("CHARS", len(block))
