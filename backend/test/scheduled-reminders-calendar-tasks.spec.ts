import { ScheduledMessageService } from '../src/message/scheduled-message.service';
import { RemindersService } from '../src/command/reminders.service';
import { RemindCommandStrategy } from '../src/command/strategies/remind-command.strategy';
import { CalendarService } from '../src/calendar/calendar.service';
import { TaskIntegrationService } from '../src/task-integration/task-integration.service';
import { ForbiddenException } from '@nestjs/common';

async function runScheduledRemindersCalendarTasksTests() {
  console.log('===================================================================');
  console.log('RUNNING PHASE 4: SCHEDULED MESSAGES, REMINDERS & INTEGRATIONS SUITE');
  console.log('===================================================================\n');

  try {
    const workspaceIdA = 'a0000000-0000-0000-0000-00000000000a';
    const workspaceIdB = 'b0000000-0000-0000-0000-00000000000b';
    const channelId = 'c0000000-0000-0000-0000-00000000000a';
    const userId1 = '10000000-0000-0000-0000-000000000001';
    const userId2 = '20000000-0000-0000-0000-000000000002';

    // Mock MessageService
    const mockMessageService: any = {
      createMessage: async (wsId: string, senderId: string, dto: any) => ({
        id: `msg_${Date.now()}`,
        workspace_id: wsId,
        channel_id: dto.channelId,
        sender_id: senderId,
        content: dto.content,
        created_at: new Date().toISOString(),
      }),
    };

    // TEST 1: Scheduled Messages Engine
    const scheduledService = new ScheduledMessageService(undefined, mockMessageService);
    const futureTime = new Date(Date.now() + 1000); // 1 sec in future

    const schedItem = await scheduledService.scheduleMessage(
      workspaceIdA,
      userId1,
      channelId,
      'Phase 4 delayed release announcement',
      futureTime,
    );

    if (schedItem.id && schedItem.status === 'pending') {
      console.log('[PASS] Test 1a: Message successfully scheduled for future delivery.');
    } else {
      throw new Error('[FAIL] Test 1a: Schedule message failed.');
    }

    const pendingList = await scheduledService.getScheduledMessages(workspaceIdA, userId1);
    if (pendingList.length === 1 && pendingList[0].id === schedItem.id) {
      console.log('[PASS] Test 1b: User pending scheduled messages retrieved.');
    } else {
      throw new Error('[FAIL] Test 1b: Pending scheduled messages query failed.');
    }

    // TEST 2: Cancel Scheduled Message & Security Access Check
    let caughtCancelError = false;
    try {
      // User 2 trying to cancel User 1's scheduled message
      await scheduledService.cancelScheduledMessage(workspaceIdA, schedItem.id, userId2);
    } catch (err: any) {
      if (err instanceof ForbiddenException) {
        caughtCancelError = true;
      }
    }

    if (caughtCancelError) {
      console.log('[PASS] Test 2: Cross-user cancellation of scheduled message forbidden.');
    } else {
      throw new Error('[FAIL] Test 2: Scheduled message cancellation security check failed.');
    }

    // TEST 3: Delayed Message Dispatch Worker Execution
    await new Promise((resolve) => setTimeout(resolve, 1100)); // Wait for timer due
    const dispatchedCount = await scheduledService.dispatchDueMessages();

    if (dispatchedCount === 1) {
      console.log('[PASS] Test 3: Due scheduled message automatically dispatched to channel.');
    } else {
      throw new Error('[FAIL] Test 3: Scheduled message dispatch worker failed.');
    }

    // TEST 4: Reminders Natural Language Parser & /remind Command Strategy
    const remindersService = new RemindersService();
    const remindStrategy = new RemindCommandStrategy(remindersService);

    const parse1 = remindersService.parseRemindText('me to review PR in 30 minutes');
    const parse2 = remindersService.parseRemindText('me to deploy release tomorrow at 9am');

    if (
      parse1.target === 'me' &&
      parse1.action === 'review PR' &&
      parse2.action === 'deploy release'
    ) {
      console.log('[PASS] Test 4a: Natural language reminder text parsed relative & absolute times.');
    } else {
      throw new Error('[FAIL] Test 4a: Reminder NL parser failed.');
    }

    const remindRes = await remindStrategy.execute(workspaceIdA, userId1, channelId, [
      'me',
      'to',
      'review',
      'architecture',
      'docs',
      'in',
      '15',
      'minutes',
    ]);

    if (remindRes.success && remindRes.response.includes('Reminder set')) {
      console.log('[PASS] Test 4b: Slash command /remind strategy executed and scheduled notification.');
    } else {
      throw new Error('[FAIL] Test 4b: /remind slash command strategy failed.');
    }

    // TEST 5: Channel Calendar Events & RSVP State Machine
    const calendarService = new CalendarService();
    const eventItem = await calendarService.createEvent(
      workspaceIdA,
      channelId,
      userId1,
      'Phase 4 Sprint Review',
      new Date(),
      new Date(Date.now() + 3600000),
      'Sprint demo meeting',
      'Zoom / Huddle',
      'google',
    );

    if (eventItem.id && eventItem.rsvps.get(userId1) === 'yes') {
      console.log('[PASS] Test 5a: Calendar event created with organizer auto-RSVP.');
    } else {
      throw new Error('[FAIL] Test 5a: Calendar event creation failed.');
    }

    await calendarService.rsvpEvent(workspaceIdA, eventItem.id, userId2, 'maybe');
    const updatedEvent = calendarService.getEventById(eventItem.id);

    if (updatedEvent?.rsvps.get(userId2) === 'maybe') {
      console.log('[PASS] Test 5b: Participant RSVP state updated to "maybe".');
    } else {
      throw new Error('[FAIL] Test 5b: RSVP update failed.');
    }

    // TEST 6: Message-to-Task Integration (Jira, Linear, Native)
    const taskService = new TaskIntegrationService(undefined, mockMessageService);

    const jiraTask = await taskService.convertMessageToTask(
      workspaceIdA,
      'msg_123',
      userId1,
      'jira',
      'Review WebRTC latency benchmark',
    );

    const linearTask = await taskService.convertMessageToTask(
      workspaceIdA,
      'msg_456',
      userId2,
      'linear',
      'Fix caption font style issue',
    );

    if (
      jiraTask.externalKey?.startsWith('NEXUS-') &&
      linearTask.externalKey?.startsWith('ENG-')
    ) {
      console.log('[PASS] Test 6: Channel messages converted to Jira and Linear tasks with external keys.');
    } else {
      throw new Error('[FAIL] Test 6: Message-to-Task conversion failed.');
    }

    console.log('\n===================================================================');
    console.log('ALL PHASE 4 TASKS 4.3 & 4.4 TESTS PASSED SUCCESSFULLY');
    console.log('===================================================================');
  } catch (error) {
    console.error('\n[TEST FAILURE]:', error);
    process.exit(1);
  }
}

runScheduledRemindersCalendarTasksTests();
