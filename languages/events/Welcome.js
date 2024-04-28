const { getTime, drive } = global.utils;
if (!global.temp.welcomeEvent)
	global.temp.welcomeEvent = {};

module.exports = {
	config: {
		name: "welcome",
		version: "1.7",
		author: "NTKhang",
		category: "events"
	},

	langs: {
		vi: {
			session1: "sáng",
			session2: "trưa",
			session3: "chiều",
			session4: "tối",
			welcomeMessage: "Cảm ơn bạn đã mời tôi vào nhóm!\nPrefix bot: %1\nĐể xem danh sách lệnh hãy nhập: %1help",
			multiple1: "bạn",
			multiple2: "các bạn",
			defaultWelcomeMessage: "Xin chào {userName}.\nChào mừng bạn đến với {boxName}.\nChúc bạn có buổi {session} vui vẻ!"
		},
		en: {
			session1: "morning",
			session2: "noon",
			session3: "afternoon",
			session4: "evening",
			welcomeMessage: "𝒚𝒐 𝒍𝒆𝒔 𝒓𝒆𝒖𝒇𝒔 𝒎𝒆𝒓𝒄𝒊 𝒑𝒐𝒖𝒓 𝒍'𝒊𝒏𝒗𝒊𝒕𝒆 𝒉𝒆𝒊𝒏..!\n𝒎𝒂𝒕𝒆́ 𝒎𝒐𝒏 𝒑𝒓𝒆𝒇𝒊𝒙 ➫ %1\n𝒔𝒊 𝒕𝒖 𝒗𝒆𝒖𝒙 𝒗𝒐𝒊𝒓 𝒎𝒂 𝒍𝒊𝒔𝒕𝒆 𝒅𝒆 𝒄𝒎𝒅 𝒆́𝒄𝒓𝒊𝒕 ➬ %1help",
			multiple1: "𝒂̀ 𝒕𝒐𝒊 ",
			multiple2: "𝒂̀ 𝒗𝒐𝒖𝒔 ",
			defaultWelcomeMessage: `𝒔𝒂𝒍𝒖𝒕 {userName}.\n𝒄'𝒆𝒔𝒕 𝒄𝒐𝒎𝒎𝒆𝒏𝒕 𝒃𝒊𝒆𝒏𝒗𝒆𝒏𝒖𝒆  {multiple} 𝒅𝒂𝒏𝒔 𝒍'𝒆𝒎𝒑𝒊𝒓𝒆 ➫ {boxName}\n𝒋'𝒆𝒔𝒑𝒆̀𝒓𝒆 𝒒𝒖𝒆 𝒕𝒖 𝒗𝒂𝒔 𝒑𝒂𝒔𝒔𝒆𝒓 𝒖𝒏𝒆 𝒆𝒙𝒄𝒆𝒍𝒍𝒆𝒏𝒕𝒆 𝒋𝒐𝒖𝒓𝒏𝒆́𝒆...😊`
		}
	},

	onStart: async ({ threadsData, message, event, api, getLang }) => {
		if (event.logMessageType == "log:subscribe")
			return async function () {
				const hours = getTime("HH");
				const { threadID } = event;
				const { nickNameBot } = global.GoatBot.config;
				const prefix = global.utils.getPrefix(threadID);
				const dataAddedParticipants = event.logMessageData.addedParticipants;
				// if new member is bot
				if (dataAddedParticipants.some((item) => item.userFbId == api.getCurrentUserID())) {
					if (nickNameBot)
						api.changeNickname(nickNameBot, threadID, api.getCurrentUserID());
					return message.send(getLang("welcomeMessage", prefix));
				}
				// if new member:
				if (!global.temp.welcomeEvent[threadID])
					global.temp.welcomeEvent[threadID] = {
						joinTimeout: null,
						dataAddedParticipants: []
					};

				// push new member to array
				global.temp.welcomeEvent[threadID].dataAddedParticipants.push(...dataAddedParticipants);
				// if timeout is set, clear it
				clearTimeout(global.temp.welcomeEvent[threadID].joinTimeout);

				// set new timeout
				global.temp.welcomeEvent[threadID].joinTimeout = setTimeout(async function () {
					const threadData = await threadsData.get(threadID);
					if (threadData.settings.sendWelcomeMessage == false)
						return;
					const dataAddedParticipants = global.temp.welcomeEvent[threadID].dataAddedParticipants;
					const dataBanned = threadData.data.banned_ban || [];
					const threadName = threadData.threadName;
					const userName = [],
						mentions = [];
					let multiple = false;

					if (dataAddedParticipants.length > 1)
						multiple = true;

					for (const user of dataAddedParticipants) {
						if (dataBanned.some((item) => item.id == user.userFbId))
							continue;
						userName.push(user.fullName);
						mentions.push({
							tag: user.fullName,
							id: user.userFbId
						});
					}
					// {userName}:   name of new member
					// {multiple}:
					// {boxName}:    name of group
					// {threadName}: name of group
					// {session}:    session of day
					if (userName.length == 0) return;
					let { welcomeMessage = getLang("defaultWelcomeMessage") } =
						threadData.data;
					const form = {
						mentions: welcomeMessage.match(/\{userNameTag\}/g) ? mentions : null
					};
					welcomeMessage = welcomeMessage
						.replace(/\{userName\}|\{userNameTag\}/g, userName.join(", "))
						.replace(/\{boxName\}|\{threadName\}/g, threadName)
						.replace(
							/\{multiple\}/g,
							multiple ? getLang("multiple2") : getLang("multiple1")
						)
						.replace(
							/\{session\}/g,
							hours <= 10
								? getLang("session1")
								: hours <= 12
									? getLang("session2")
									: hours <= 18
										? getLang("session3")
										: getLang("session4")
						);

					form.body = welcomeMessage;

					if (threadData.data.welcomeAttachment) {
						const files = threadData.data.welcomeAttachment;
						const attachments = files.reduce((acc, file) => {
							acc.push(drive.getFile(file, "stream"));
							return acc;
						}, []);
						form.attachment = (await Promise.allSettled(attachments))
							.filter(({ status }) => status == "fulfilled")
							.map(({ value }) => value);
					}
					message.send(form);
					delete global.temp.welcomeEvent[threadID];
				}, 1500);
			};
	}
};
