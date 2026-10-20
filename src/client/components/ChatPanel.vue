<script setup lang="ts">
/** Messages of the room and the form to talk. */
import { computed, onMounted, ref } from 'vue';
import { MessageMute } from '../model/message/MessageMute.js';
import { useServices } from '../services';
import { useEmitterVersion } from '../composables/useEmitter';
import type { ChatMessage, Player } from '../types';

const props = defineProps<{ kickPlayer?: (player: Player) => void }>();

const { chat } = useServices();
const { version, bump } = useEmitterVersion(chat, ['message', 'filtered']);

const feed = ref<HTMLElement>();
const messages = computed(() => (version.value >= 0 ? chat.messages.items.slice() : []));

onMounted(() => chat.setElement(feed.value as HTMLElement));

/** Mute (or unmute) the author of the message */
function mute(message: ChatMessage): void {
    const { client, player } = message as unknown as { client: number; player: unknown };

    if (chat.toggleMute(client)) {
        chat.addMessage(new MessageMute(client, player) as unknown as ChatMessage);
    } else {
        chat.removeMessage(message);
    }

    bump();
}

function kick(player: Player): void {
    props.kickPlayer?.(player);
}
</script>

<template>
    <div id="chat-feed" ref="feed" class="feed">
        <div v-for="message in messages" :key="message.id" class="one-message">
            <div class="details">
                <span class="time">{{ message.date }}</span>
            </div>
            <span v-if="message.icon" class="message-icon" :class="message.icon"></span>
            <span v-else class="message-icon message-name" :style="{ color: message.player?.color }">
                <span class="mute icon-mute" title="Mute" @click="mute(message)"></span>
                {{ message.player?.name }}:
            </span>
            <span class="message-content">
                <!-- Vote Kick -->
                <span v-if="message.type === 'vote-kick' && message.target">
                    <span v-if="!message.target.local && !message.target.kicked">
                        Do you want to kick
                        <span :style="{ color: message.target.color }">{{ message.target.name }}</span
                        >? <span class="action" @click="kick(message.target)">Yes!</span>
                    </span>
                    <span v-else-if="!message.target.local && message.target.kicked">
                        Ongoing vote to kick
                        <span :style="{ color: message.target.color }">{{ message.target.name }}</span
                        >. <span class="action" @click="kick(message.target)">Cancel?</span>
                    </span>
                    <span v-else>
                        Ongoing vote to kick
                        <span :style="{ color: message.target.color }">{{ message.target.name }}</span
                        >.
                    </span>
                </span>

                <!-- Kick -->
                <span v-else-if="message.type === 'kick' && message.target">
                    Farewell <span :style="{ color: message.target.color }">{{ message.target.name }}</span
                    >, you have been kicked.
                </span>

                <!-- Room master -->
                <span v-else-if="message.type === 'room-master' && message.getTarget">
                    <span :style="{ color: message.getTarget().color }">{{ message.getTarget().name }}</span> is now the
                    room master.
                </span>

                <!-- Mute -->
                <span v-else-if="message.type === 'mute'">
                    You muted <span :style="{ color: message.player?.color }">{{ message.player?.name }}</span
                    >. <span class="action" @click="mute(message)">Cancel?</span>
                </span>

                <!-- Default -->
                <span v-else>{{ message.content }}</span>
            </span>
        </div>
    </div>

    <form class="action-line" name="talk" autocomplete="off" @submit.prevent="chat.talk()">
        <button type="submit" class="btn btn-default">
            <span><i class="icon-angle-right"></i></span>
        </button>
        <input
            v-model="chat.message.content"
            type="text"
            name="currentMessage"
            class="sent-message form-control"
            placeholder="Enter message..."
            :maxlength="chat.message.maxLength"
        />
        <div class="clearfix"></div>
    </form>
</template>
