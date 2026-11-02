/* Sepharial data; see SOURCE_NOTES.md. */
export const SIGNS=["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
export const PORTRAIT={
Aries:["Great ambitions; honours; boldness; aptitude; courage; prominence.","Generous, courageous, worthy, ingenious and well-informed; at times fickle."],
Taurus:["Changes; voyages; durable and lasting affairs; fruitfulness; public affairs.","Imaginative, impulsive, laborious, calm and patient in work; proud."],
Gemini:["Indifferent fortunes; accidents in the life; inventions; discoveries; the sciences.","Philosophical, artistic, quick in intellect, eloquent, industrious and good-natured."],
Cancer:["Voyages by sea; life by the water; publicity; good fortune; happiness; supremacy.","Dreamy, eccentric, prudent, a good friend; inclined to inconstancy."],
Leo:["Great honours; enterprises; elevation; glory; celebrity.","Ambitious, constant, noble, kind and generous; more artistic and adventurous than bookish."],
Virgo:["Opposition from others; delays in love, friendship and marriage; honours attained with difficulty.","Wise, learned, literary, spiritual, benevolent, a lover of hidden things."],
Libra:["Unforeseen sorrows; honours hard-won; few enemies; some accidents; trouble through women.","Loving, sweet-tempered, just; not greatly literary or artistic."],
Scorpio:["Troubles in love; long voyages; dangerous wounds; bad counsel; secret things.","Bold, warlike, sarcastic, punctilious, wilful."],
Sagittarius:["Success; fortune; chance of elevation; strife; a mystical bent.","Good-tempered, kind, obliging, a good friend, liberal and just, loving glory."],
Capricorn:["Unexpected sorrows; perils; many envious enemies; love of travel; contests.","Wilful, stubborn, ponderous, taciturn, economical; liable to sudden change of policy."],
Aquarius:["Sorrows; fortune; small honours; trouble through relatives; faithful friends; helpful protectors.","Chaste, humane, kind, inclined to solitude, righteous, patient in work."],
Pisces:["Good fortune; some strange troubles; honours and popularity; uncertain alliances.","Eloquent, spiritual, quick-minded, hard to know, gay, changeful, passionate."]};
export const POINTS={
1:["The Beginning","Creative will; works in their beginnings; invention; building up.","good"],
2:["The Hidden Door","Strife; enmity; dissension; perception of high truths.","bad"],
3:["Fruitfulness","Perfection in love; harmony; marriage; fruitfulness; effort rewarded.","good"],
4:["The Cornerstone","Realization; things accomplished; establishment; endurance; protection.","good"],
5:["The Contest","Contests; pain; fire; unfortunate impulses; anger.","bad"],
6:["The Two Ways","Uncertainty in marriage; danger of seduction; irregularities; a choice to be made.","bad"],
7:["The Triumph","Triumph; honour; glory; reputation; success; victory.","good"],
8:["The Balance","Moral liabilities; strife; ruptures; separation; breaking of ties; lawsuits.","bad"],
9:["The Lamp","Authority and power by merit; experience; wisdom; prudence.","good"],
10:["The Wheel","Elevation from a humbler place, or fall from a high one; reversals; a turning year.","mixed"],
11:["The Lion Muzzled","Success in bold enterprises; courage; decision; energy.","good"],
12:["The Sacrifice","Reversal of position; chastisement; loss of honour; catastrophe; danger to life.","bad"],
13:["The Reaper","Ambitions and hopes deceived; destruction; undoing; death of a thing.","bad"],
14:["The Two Urns","Dangers through lack of initiative; the force of the elements; temperance required.","bad"],
15:["Typhon","Fate; the inevitable; the unexpected; dangers to offspring and marriage; luxury.","bad"],
16:["The Blasted Tower","Overthrow; ruin; catastrophe; accidents; falls — the gravest of the points.","bad"],
17:["The Star","Hope, favourable or the reverse; uncertainty; insight; visions.","mixed"],
18:["The Twilight","Crosses in love; false security; hidden perils; treacheries; deceptions.","bad"],
19:["The Resplendent Light","Good fortune; successful marriage; honours; glory; happy associations.","good"],
20:["The Awakening","Continual hindrances yet unexpected elevation; a call to be ready.","mixed"],
21:["The Crown","Dignities; honours; success; aspirations attained.","good"],
22:["The Blind Fool","Blind presumption; success followed by loss; entrapment; final catastrophe.","bad"]};
export const HOUSE_PASS={
1:["I","Your birth sign returns to the first house: a year judged by your own sign and nature.","neutral"],
12:["XII","Troubles hard to overcome; obstacles in all affairs; sickness; bad for travel, negotiation or contest; treachery among supposed friends; sorrows and persecutions.","bad"],
11:["XI","Anxieties; reputation at risk; difficulties in undertakings; checks by secret enemies — yet support from devoted friends; short journeys or change of position.","mixed"],
10:["X","Good success in enterprises; fortune augmented; good for sea journeys and conquest of enemies; good reputation; possibility of marriage; family mourning.","good"],
9:["IX","Good year for travel, for friendship and love, for high patronage and enterprise; liability to scandal.","good"],
8:["VIII","Illness; danger of death; treason of friends; injurious love affairs; friends become enemies.","bad"],
7:["VII","Danger from robbery or fire; good year for marriage; disagreement with relations; disgrace with superiors; great change in position.","mixed"],
6:["VI","Dangerous sickness; heavy contests and strifes; lasting enmities; moderate success; great need of watchfulness.","bad"],
5:["V","Danger of treachery, but probable good fortune; creditable associations; favours from superiors; opportunity of marriage; providential help.","good"],
4:["IV","Legacy or gift; danger of loss or of drowning; fortunate for personal enterprises; family journeys; opposition in love.","good"],
3:["III","Year of travel or change of residence; danger of lasting hatred and secret disease; disgrace with superiors; loss of wealth and friends; the position unfortunate.","bad"],
2:["II","Good year for money, but danger of being robbed; friends become enemies; danger from horses and cattle; favoured by patrons; long voyages possible.","mixed"]};
export const RISING={
Aries:{bad:["Virgo","Scorpio","Pisces"],t:"Danger of wounds or dislocation; sickness; mourning; release from enemies; gain by alliances; marriage or close association; danger by water; good for love; legacies realized; triumph over enemies."},
Taurus:{bad:["Libra","Sagittarius","Aries"],t:"Heavy quarrels; sickness; difficulties in business and love; helpful friendships followed by misunderstandings; hidden enemies; changes of residence; losses through friends; separation if the nativity shows it."},
Gemini:{bad:["Scorpio","Capricorn","Taurus"],t:"Danger of falls; unstable position; wounds and mourning; considerable gain soon dissipated; honours to relatives; strife among friends; illness almost certain; wounded affections."},
Cancer:{bad:["Gemini","Sagittarius","Aquarius"],t:"Honours of some magnitude; elevation; beneficial changes; danger to children; love impeded by relatives; sickness of the partner; danger in partnerships; secret enemies; help from patrons; loss of property."},
Leo:{bad:["Capricorn","Pisces","Cancer"],t:"Short journeys with some loss; harmful enterprises; harm from friends in money; trouble through children; the position greatly prospers or the reverse; a death profitable; avoid boats and deep water; the partner afflicted; distrust of servants."},
Virgo:{bad:["Aries","Leo","Capricorn","Aquarius"],t:"A difficult position; declared enmities that do not seriously harm; new enterprises and ideas; inclination to marriage but instability; danger to children by water; loss of friends; sickness from excess; conjugal discord."},
Libra:{bad:["Pisces","Virgo","Taurus"],t:"Danger from secret enemies; the family renders service; corporeal hurts; fortunate associations through the partner; inordinate appetites; relatives create strife; good health; instability; treacheries."},
Scorpio:{bad:["Aries","Gemini","Cancer","Libra"],t:"Elevation and honours; love or marriage; long voyages with danger; patronage of ladies of position; change of residence leading to strife; secret love affairs; danger of drowning; separation; malevolent relatives; benefits by science and discovery."},
Sagittarius:{bad:["Taurus","Cancer","Scorpio"],t:"Danger of falls from high places or loss of position; financial loss; gain by friends; obstacles in love; conjugal discord; unforeseen gifts or inheritance; grave illness; sickness of children; success in litigation."},
Capricorn:{bad:["Gemini","Leo","Sagittarius"],t:"New ambitions; lucrative enterprises; success in the profession; long journeys and sea voyages to be shunned; change of residence; disappointing short journeys; conjugal discord; cautious of new friendships; unseen hindrances; beware horses and servants; danger of accidental poisoning."},
Aquarius:{bad:["Cancer","Virgo","Capricorn"],t:"Many short journeys; benefits sure but not lasting; affections of head or chest; wounds by fire and iron; unstable position; wealth affected by secret enemies; harmful associations; a very dangerous period; snares; danger to children; physical dangers on water."},
Pisces:{bad:["Leo","Libra","Aquarius"],t:"Position and occupation benefited; misunderstandings with friends; slander; changeful affections; treachery of friends; dangerous illness of heart or stomach; death among relatives; contests about marriage; travel certain; separation; false friends and failing patrons."}};
export const LETTER={A:1,B:2,C:2,D:4,E:5,F:8,G:3,H:8,I:1,J:1,K:2,L:3,M:4,N:5,O:7,P:8,Q:1,R:2,S:3,T:4,U:6,V:6,W:6,X:6,Y:1,Z:7};
export const MONTH_START=[281,312,341,12,42,71,100,129,159,189,220,250];
export const DOUBLED={4:[21,31],5:[22],6:[23,31],7:[31]};
export const MN=["January","February","March","April","May","June","July","August","September","October","November","December"];
export const CYCLE_ORDER=["Saturn","Venus","Jupiter","Mercury","Mars","Moon","Sun"];
export const NATURAL=["Saturn","Jupiter","Mars","Sun","Venus","Mercury","Moon"];
