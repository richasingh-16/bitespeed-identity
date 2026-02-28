import { prisma } from "../prisma";

export async function identify(email?: string, phoneNumber?: string) {

    // ---------------- 1️⃣ FIND MATCHES ----------------

    const matches = await prisma.contact.findMany({
        where: {
            OR: [
                email ? { email } : undefined,
                phoneNumber ? { phoneNumber } : undefined
            ].filter(Boolean) as any
        }
    });

    // ---------------- 2️⃣ NO MATCHES → CREATE PRIMARY ----------------

    if (matches.length === 0) {
        const newContact = await prisma.contact.create({
            data: {
                email,
                phoneNumber,
                linkPrecedence: "primary",
                linkedId: null
            }
        });

        return formatResponse([newContact]);
    }

    // ---------------- 3️⃣ DETECT ROOT PRIMARY IDS ----------------

    const rootIds = new Set<number>();

    for (const contact of matches) {
        if (contact.linkPrecedence === "primary") {
            rootIds.add(contact.id);
        } else if (contact.linkedId) {
            rootIds.add(contact.linkedId);
        }
    }

    let finalPrimaryId: number;

    // ---------------- 4️⃣ MERGE IF MULTIPLE ROOTS ----------------

    if (rootIds.size > 1) {

        const primaries = await prisma.contact.findMany({
            where: {
                id: { in: Array.from(rootIds) }
            }
        });

        // Oldest primary wins
        primaries.sort(
            (a, b) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime()
        );

        const finalPrimary = primaries[0];
        finalPrimaryId = finalPrimary.id;

        const otherPrimaries = primaries.slice(1);

        await prisma.$transaction(async (tx) => {

            // Convert losing primaries to secondary
            for (const p of otherPrimaries) {

                await tx.contact.update({
                    where: { id: p.id },
                    data: {
                        linkPrecedence: "secondary",
                        linkedId: finalPrimary.id
                    }
                });

                await tx.contact.updateMany({
                    where: { linkedId: p.id },
                    data: { linkedId: finalPrimary.id }
                });

            }

        });

    } else {
        finalPrimaryId = Array.from(rootIds)[0];
    }

    // ---------------- 5️⃣ FETCH FULL CLUSTER ----------------

    let cluster = await prisma.contact.findMany({
        where: {
            OR: [
                { id: finalPrimaryId },
                { linkedId: finalPrimaryId }
            ]
        }
    });

    // ---------------- 6️⃣ CHECK FOR NEW INFO ----------------

    const existingEmails = new Set(
        cluster.map(c => c.email).filter(Boolean)
    );

    const existingPhones = new Set(
        cluster.map(c => c.phoneNumber).filter(Boolean)
    );

    const isNewEmail = email && !existingEmails.has(email);
    const isNewPhone = phoneNumber && !existingPhones.has(phoneNumber);

    if (isNewEmail || isNewPhone) {

        const alreadyExists = cluster.some(
            c =>
                c.email === email &&
                c.phoneNumber === phoneNumber
        );

        if (!alreadyExists) {
            const newSecondary = await prisma.contact.create({
                data: {
                    email,
                    phoneNumber,
                    linkPrecedence: "secondary",
                    linkedId: finalPrimaryId
                }
            });

            cluster.push(newSecondary);
        }
    }

    return formatResponse(cluster);
}


// ---------------- RESPONSE FORMAT ----------------

function formatResponse(cluster: any[]) {

    const primary = cluster.find(
        c => c.linkPrecedence === "primary"
    )!;

    const emails = [
        primary.email,
        ...cluster
            .filter(c => c.id !== primary.id)
            .map(c => c.email)
            .filter(Boolean)
    ];

    const phones = [
        primary.phoneNumber,
        ...cluster
            .filter(c => c.id !== primary.id)
            .map(c => c.phoneNumber)
            .filter(Boolean)
    ];

    return {
        contact: {
            primaryContactId: primary.id,
            emails: [...new Set(emails)],
            phoneNumbers: [...new Set(phones)],
            secondaryContactIds: cluster
                .filter(c => c.linkPrecedence === "secondary")
                .map(c => c.id)
        }
    };
}