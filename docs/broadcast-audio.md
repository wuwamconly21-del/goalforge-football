# Broadcast audio and timing — v1.6

Each listener taps **Enable sound** once. The home page plays *Tenang Sebelum Ribut*; audio downloads only after sound is enabled. Master, music and crowd/effects volume are local to that listener. Background tabs stop playback and resume the current phase on return.

| Phase | Recording |
| --- | --- |
| Home | Tenang Sebelum Ribut |
| First match of each season | Mahawangsa Cup Musim Kedua |
| Entrance and lineup | Arena Pulse |
| Live match | Uploaded cheering crowd, procedural ball kicks, whistle and weather |
| Goal / scored shoot-out kick | Olé, capped at ten seconds, with other music ducked |
| Miss / save / card | Uploaded disappointed or shocked crowd reactions |
| Half-time | Wira Arena |
| Full-time | Majulah Wira Arena |
| Between matches | Uploaded `.mp3.mp3` break recording |

The main opening is an animated tournament title, trophy and uploaded team crests, with an explicit video placeholder. It lasts 83 seconds before the existing 16-second player entrance, both lineups and countdown. A future video can replace this placeholder.

Admins open **Match schedule → Broadcast timing** to configure the main opening, sponsor breaks and regulation playing time. A match can represent 90 football minutes in 3, 5, 10 or 15 real minutes; stoppages, half-time, extra time and shoot-outs add time. The speed is frozen at kick-off, so changing settings affects subsequent matches only. Simulation outcomes are unchanged.

The default sponsor interval is **3:08**. Admins can choose 3:00, 3:08, 3:30 or 4:00, or disable breaks for subsequent intervals. Approved sponsor brands and enabled banner creatives rotate every 12 seconds using the same server timeline for everyone. Empty slots invite sponsorship applications from the Stadium tab. These are your own sponsor placements, not an external ad network or automatic billing system.

Set each fixture's **opening date/time in Malaysia (UTC+8)** in its schedule editor and enable automatic start. That time starts its opening sequence, including the season ceremony when appropriate. Overlapping fixtures wait for the current match and sponsor interval. Manual kick-off also respects an active interval. An unscheduled fixture still requires an admin to start it. The next season remains admin-only.

The live release verifies the application version, built frontend and all ten deployed MP3 files byte-for-byte. Uploaded source files are preserved; the web copies strip embedded covers/metadata, normalize loudness and use 96 kbps MP3 audio.
