Moralis.Cloud.define("searchEthAddress", async function (request) {
    const { address } = request.params;
    if (!address) {
        return null;
    }

    // find out if address is already watched
    const query = new Moralis.Query("WatchedEthAddress");
    query.equalTo("address", address);
    const watchCount = await query.count();

    if (watchCount > 0) {
        // already watched dont sync again
        return null;
    }

    return Moralis.Cloud.run("watchEthAddress", { address });
});


Moralis.Cloud.define("getEthTransactions", async (request) => {
    const { addressString, pageSize, pageNumber } = request.params;
    const offset = (pageNumber - 1) * pageSize; // did this change? 23

    const userAddress = addressString.toLowerCase();
    const query = new Moralis.Query("EthTransactions");
    query.equalTo("from_address", userAddress);
    query.descending("block_number");
    query.withCount();
    query.skip(offset);
    query.limit(pageSize);

    return await query.find();
}, {
    fields: {
        addressString: {
            required: true,
            type: String,
            error: "User ETH address required",
        },
        pageSize: {
            required: true,
            type: Number,
            options: val => val > 0 && val <= 100,
            error: "pageSize must be between 1 and 100",
        },
        pageNumber: {
            type: Number,
            options: val => val > 0,
            error: "pageNumber must be positive",
        },
    }
});


Moralis.Cloud.define("getTokenTransfers", async (request) => {
    const { addressString: userAddress, pageSize, pageNumber } = request.params;
    const offset = (pageNumber - 1) * pageSize;
    const output = {
        results: [],
        count: 0,
    };

    // count results
    const matchPipeline = {
        match: {
            $expr: {
                $or: [
                    { $eq: ["$from_address", userAddress] },
                    { $eq: ["$to_address", userAddress] },
                ],
            },
        },
        sort: { block_number: -1 },
        count: "count",
    };
    const query = new Moralis.Query("EthTokenTransfers");
    const countResult = await query.aggregate(matchPipeline);
    output.count = countResult[0].count;

    // get page results
    const lookupPipeline = {
        ...matchPipeline,
        skip: offset,
        limit: pageSize,
        lookup: {
            from: "EthTokenBalance",
            let: { tokenAddress: "$token_address", userAddress },
            pipeline: [
                {
                    $match: {
                        $expr: {
                            $and: [
                                { $eq: ["$token_address", "$$tokenAddress"] },
                                { $eq: ["$address", "$$userAddress"] },
                            ],
                        },
                    },
                },
            ],
            as: "EthTokenBalance",
        },
        unwind: "$EthTokenBalance",
    };
    delete lookupPipeline.count;

    output.results = await query.aggregate(lookupPipeline);
    return output;
});


Moralis.Cloud.define("getTokenBalances", async (request) => {
    const { addressString: userAddress, pageSize, pageNumber } = request.params;
    const offset = (pageNumber - 1) * pageSize;

    // count results
    const query = new Moralis.Query("EthTokenBalance");
    const matchPipeline = {
        match: {
            address: userAddress,
            contract_type: "ERC20",
            balance: { $ne: "0" },
        },
    };
    const countPipeline = { ...matchPipeline, count: "count" };
    const countResult = await query.aggregate(countPipeline);

    // get page
    const pagePipeline = {
        ...matchPipeline,
        addFields: {
            adjBal: {
                $divide: [
                    { $toDouble: "$balance" },
                    { $pow: [10, { $toDouble: "$decimals" }] },
                ],
            },
        },
        sort: { adjBal: -1 },
        skip: offset,
        limit: pageSize,
    };
    const pageResults = await query.aggregate(pagePipeline);

    const output = {
        results: pageResults,
        count: countResult[0].count,
    };

    return output;
});


Moralis.Cloud.define("getMyServicesCount", async (request) => {
    const user = request.user;
    const query = new Moralis.Query('Services');
    query.equalTo("provider", user);
    const count = await query.count();
    return count;
});


Moralis.Cloud.define("getInfuraApiKey", async () => {
    const config = await Moralis.Config.get({ useMasterKey: true });
    const infuraApiKey = config.get("infuraApiKey");
    return infuraApiKey;
});


Moralis.Cloud.define("timeToUTC", request => {

    const time = request.params.time;
    const offset = request.params.offset;

    var d = new Date(`2021-02-13 ${time.slice(0, 2)}:${time.slice(3)}:00 ${offset < 0 ? "GMT-" : "GMT+"}${parseInt(Math.abs(offset)) < 10 ? "0" + parseInt(Math.abs(offset)) : parseInt(Math.abs(offset))}${(Math.abs(offset) % 1) * 60 < 10 ? "0" + (Math.abs(offset) % 1) * 60 : (Math.abs(offset) % 1) * 60}`);
    var hoursUTC = d.getUTCHours();
    var minsUTC = d.getUTCMinutes();
    var dayUTC = d.getUTCDay();

    return ({ time: String(`${hoursUTC < 10 ? 0 + String(hoursUTC) : hoursUTC}:${minsUTC < 10 ? 0 + String(minsUTC) : minsUTC}`), adj: dayUTC === 6 ? 0 : (dayUTC === 5 ? -1 : 1) });

});

Moralis.Cloud.define("timeFromUTC", request => {

    const time = request.params.time;
    const offset = request.params.offset;

    var d = new Date(`2021-02-13 ${time.slice(0, 2)}:${time.slice(3)}:00 ${offset < 0 ? "GMT+" : "GMT-"}${parseInt(Math.abs(offset)) < 10 ? "0" + parseInt(Math.abs(offset)) : parseInt(Math.abs(offset))}${(Math.abs(offset) % 1) * 60 < 10 ? "0" + (Math.abs(offset) % 1) * 60 : (Math.abs(offset) % 1) * 60}`); var hoursUTC = d.getUTCHours();
    var hoursUTC = d.getUTCHours();
    var minsUTC = d.getUTCMinutes();
    var dayUTC = d.getUTCDay();

    return ({ time: String(`${hoursUTC < 10 ? 0 + String(hoursUTC) : hoursUTC}:${minsUTC < 10 ? 0 + String(minsUTC) : minsUTC}`), adj: dayUTC === 6 ? 0 : (dayUTC === 5 ? -1 : 1) });

});


Moralis.Cloud.afterSave("ReviewedUser", async (request) => {

    const { object } = request;

    const BookingsPublic = Moralis.Object.extend("BookingsPublic");
    let queryBookingsPublic = new Moralis.Query(BookingsPublic);
    queryBookingsPublic.equalTo("bookingBytes32", object.attributes.booking);
    queryBookingsPublic.include("booking");
    queryBookingsPublic.include("providerPublic");
    queryBookingsPublic.include("userPublic");

    let bookingPublic = await queryBookingsPublic.first();

    if (bookingPublic.attributes.userRating) {
        // provider already reviewed user
        return null;
    }

    bookingPublic.set("userRating", String(object.attributes.rating / 10));
    await bookingPublic.save(null, { useMasterKey: true });


    const UserPublic = Moralis.Object.extend("UserPublic");
    let queryUserPublic = new Moralis.Query(UserPublic);
    queryUserPublic.equalTo("objectId", bookingPublic.attributes.userPublic.id);

    let userPublic = await queryUserPublic.first();
    let newRatingUser = ((userPublic.attributes.userRating * userPublic.attributes.userReviewCount) + (Number(object.attributes.rating) / 10)) / (userPublic.attributes.userReviewCount + 1)
    userPublic.set("userRating", newRatingUser);
    userPublic.increment("userReviewCount");
    await userPublic.save(null, { useMasterKey: true });


    const uhuReceived = Number(bookingPublic.attributes.providerUhu / 10 ** 18).toFixed(4);

    const userPublic1 = bookingPublic.attributes.userPublic;
    const providerPublic1 = bookingPublic.attributes.providerPublic;

    const Events = Moralis.Object.extend("Events");

    const queryUserEvents = new Moralis.Query(Events);
    queryUserEvents.equalTo("userPublic", userPublic1);
    const userEvents = await queryUserEvents.first();
    let newUserEventsArray = [{ id: Date.now(), title: `${providerPublic1.attributes.username} reviewed You`, detail: `${providerPublic1.attributes.username} has give you a rating and a brief review for your booking ${bookingPublic.attributes.booking.id}. Click here to view your booking.`, link: `/activity/you/booked/${bookingPublic.attributes.booking.id}`, side: "user" }].concat(userEvents.attributes.newEvents);
    userEvents.set("newEvents", newUserEventsArray);
    await userEvents.save(null, { useMasterKey: true });

    const queryProviderEvents = new Moralis.Query(Events);
    queryProviderEvents.equalTo("userPublic", providerPublic1);
    const providerEvents = await queryProviderEvents.first();
    let newProviderEventsArray = [{ id: Date.now(), title: `You reviewed ${userPublic1.attributes.username}`, detail: `Your review of ${userPublic1.attributes.username} has been successfully submitted. You received ${uhuReceived} UHU Tokens as Thank you for using YouWho.io! Click here to view your wallet.`, link: `/wallet`, side: "provider" }].concat(providerEvents.attributes.newEvents);
    providerEvents.set("newEvents", newProviderEventsArray);
    await providerEvents.save(null, { useMasterKey: true });


    return;

});


Moralis.Cloud.afterSave("Payments", async (request) => {

    const { object } = request;

    const Payments = Moralis.Object.extend("Payments");
    let queryPayments = new Moralis.Query(Payments);
    queryPayments.equalTo("booking", object.attributes.booking);

    let paymentsCount = await queryPayments.count();

    if (paymentsCount > 1) {
        // already paid and reviewed
        return null;
    }

    // bookingspublic update
    const BookingsPublic = Moralis.Object.extend("BookingsPublic");
    let queryBookingsPublic = new Moralis.Query(BookingsPublic);
    queryBookingsPublic.equalTo("bookingBytes32", object.attributes.booking);
    queryBookingsPublic.include("booking");
    queryBookingsPublic.include("providerPublic");

    let bookingPublic = await queryBookingsPublic.first();
    bookingPublic.set("bookingPayment", object);
    bookingPublic.set("userUhu", object.attributes.amountUhu);
    bookingPublic.set("providerUhu", String(object.attributes.amountUhu / 10));
    bookingPublic.set("approval", "paid");
    bookingPublic.set("providerRating", String(object.attributes.rating / 10));
    await bookingPublic.save(null, { useMasterKey: true });


    const ServicesPublic = Moralis.Object.extend("ServicesPublic");
    let queryServicesPublic = new Moralis.Query(ServicesPublic);
    queryServicesPublic.equalTo("service", bookingPublic.attributes.service);

    let servicePublic = await queryServicesPublic.first();
    let newRating = ((servicePublic.attributes.rating * servicePublic.attributes.reviewCount) + (Number(object.attributes.rating) / 10)) / (servicePublic.attributes.reviewCount + 1)
    servicePublic.set("rating", newRating);
    servicePublic.increment("reviewCount");
    await servicePublic.save(null, { useMasterKey: true });


    const UserPublic = Moralis.Object.extend("UserPublic");
    let queryUserPublic = new Moralis.Query(UserPublic);
    queryUserPublic.equalTo("objectId", bookingPublic.attributes.providerPublic.id);

    let providerPublic = await queryUserPublic.first();
    let newRatingProvider = ((providerPublic.attributes.providerRating * providerPublic.attributes.providerReviewCount) + (Number(object.attributes.rating) / 10)) / (providerPublic.attributes.providerReviewCount + 1)
    providerPublic.set("providerRating", newRatingProvider);
    providerPublic.increment("providerReviewCount");
    await providerPublic.save(null, { useMasterKey: true });


    const BookingsApproval = Moralis.Object.extend("BookingsApproval");
    let queryBookingsApproval = new Moralis.Query(BookingsApproval);
    queryBookingsApproval.equalTo("bookingsPublic", bookingPublic);

    let bookingApproval = await queryBookingsApproval.first();
    bookingApproval.set("approval", "paid");
    await bookingApproval.save(null, { useMasterKey: true });


    const uhuReceived = Number(object.attributes.amountUhu / 10 ** 18).toFixed(4);

    const userPublic1 = bookingPublic.attributes.userPublic;
    const providerPublic1 = bookingPublic.attributes.providerPublic;

    const Events = Moralis.Object.extend("Events");

    const queryUserEvents = new Moralis.Query(Events);
    queryUserEvents.equalTo("userPublic", userPublic1);
    const userEvents = await queryUserEvents.first();
    let newUserEventsArray = [{ id: Date.now(), title: `Booking ${bookingPublic.attributes.booking.id} payment successful`, detail: `Your payment for booking ${bookingPublic.attributes.booking.id} was successful. You received ${uhuReceived} UHU Tokens as Thank you for using YouWho.io! Click here to view your wallet.`, link: `/wallet`, side: "user" }].concat(userEvents.attributes.newEvents);
    userEvents.set("newEvents", newUserEventsArray);
    await userEvents.save(null, { useMasterKey: true });

    const queryProviderEvents = new Moralis.Query(Events);
    queryProviderEvents.equalTo("userPublic", providerPublic1);
    const providerEvents = await queryProviderEvents.first();
    let newProviderEventsArray = [{ id: Date.now(), title: `Booking ${bookingPublic.attributes.booking.id} payment received`, detail: `You have received payment for booking # ${bookingPublic.attributes.booking.id}. Click here to view your booking.`, link: `/activity/who/bookings/${bookingPublic.attributes.booking.id}`, side: "provider" }].concat(providerEvents.attributes.newEvents);
    providerEvents.set("newEvents", newProviderEventsArray);
    await providerEvents.save(null, { useMasterKey: true });


    return;

});


Moralis.Cloud.define("setPaymentAmount", async (request) => {

    const { paymentAmount, bookingPublic, crypto, paymentCrypto, priceAtTime } = request.params;

    const BookingsPublic = Moralis.Object.extend("BookingsPublic");
    let queryBookingsPublic = new Moralis.Query(BookingsPublic);
    queryBookingsPublic.equalTo("objectId", bookingPublic);

    let bookingPublic1 = await queryBookingsPublic.first();
    bookingPublic1.set("paidAmountUsd", String(paymentAmount));
    bookingPublic1.set("cryptoUsed", crypto);
    bookingPublic1.set("paidAmountCrypto", Number(paymentCrypto));
    bookingPublic1.set("CryptoUsdPriceAtTimeOfPayment", String(priceAtTime));
    await bookingPublic1.save(null, { useMasterKey: true });

    return;

});


Moralis.Cloud.afterSave("Services", async (request) => {

    const { object } = request;

    const ServicesPublic = Moralis.Object.extend("ServicesPublic");
    let query = new Moralis.Query(ServicesPublic);
    query.equalTo("service", object);

    let queryCount = await query.count();

    if (queryCount > 0) {
        // service is already made so no need to make another
        return null;
    }

    const servicePublic = new ServicesPublic();
    servicePublic.set('service', object);
    await servicePublic.save(null, { useMasterKey: true }).then(async (servicePublic) => {
        const Services = Moralis.Object.extend("Services");
        let queryService = new Moralis.Query(Services);
        queryService.equalTo("objectId", object.id);
        let service = await queryService.first();
        service.set('servicesPublic', servicePublic);
        await service.save(null, { useMasterKey: true })
    })


    const provider = object.attributes.provider;

    const Events = Moralis.Object.extend("Events");

    const queryProviderEvents = new Moralis.Query(Events);
    queryProviderEvents.equalTo("user", provider);
    const providerEvents = await queryProviderEvents.first();
    let newProviderEventsArray = [{ id: Date.now(), title: `New Service ${object.id} posted`, detail: `Your new Service ${object.id} has been successfully posted. Click here to view your service.`, link: `/activity/who/myservices/${object.id}`, side: "provider" }].concat(providerEvents.attributes.newEvents);
    providerEvents.set("newEvents", newProviderEventsArray);
    await providerEvents.save(null, { useMasterKey: true });






    return;
});


Moralis.Cloud.beforeSave("Services", async (request) => {

    const user = request.user;
    const object = request.object;

    const query = new Moralis.Query('Services');
    query.equalTo("provider", user);
    const count = await query.count();
    if (count >= 10) {
        throw new Error(`You have reached your post limit of 10 posted services per user. Please remove an old/existing service before posting a new service.`);
    };

    // object.set('provider', user);

},
    {
        fields: {
            category: {
                required: true,
                type: String,
                error: "Please choose a category",
            },
            subCategory: {
                type: String,
                options: val => val.length <= 30,
                error: "Sub-Category is too long, please keep it less than 30 characters (including spaces).",
            },
            title: {
                required: true,
                type: String,
                options: val => val.length <= 40,
                error: "Title has not been provided or is too long, please keep it less than 40 characters (including spaces).",
            },
            rate: {
                required: true,
                type: Number,
                options: val => String(val).length <= 10 && val >= 1,
                error: "Rate has not been provided or is too large, please keep it less than 10 Numbers (including decimals).",
            },
            description: {
                type: String,
                options: val => val.length <= 1000,
                error: "Description is too long, please keep it less than 1000 characters (including spaces).",
            },
            myLat: {
                required: true,
                type: Number,
                options: val => String(val).length <= 20 && val <= 90 && val >= -90,
                error: "Your Latitude value has not been provided or is too large, please keep it less than 20 Numbers (including decimals).",
            },
            myLong: {
                required: true,
                type: Number,
                options: val => String(val).length <= 20 && val <= 180 && val >= -180,
                error: "Your Longitude value has not been provided or is too large, please keep it less than 20 Numbers (including decimals).",
            },
        },
        requireUser: true,
    }
);


Moralis.Cloud.afterSave("Bookings", async (request) => {

    const { object } = request;
    // const object = request.object;

    const BookingsPublic = Moralis.Object.extend("BookingsPublic");
    let query = new Moralis.Query(BookingsPublic);
    query.equalTo("booking", object);

    let queryCount = await query.count();

    if (queryCount > 0) {
        // booking is already made so no need to make another
        return null;
    }

    const bookingPublic = new BookingsPublic();
    bookingPublic.set('booking', object);
    bookingPublic.set("userPublic", object.attributes.userPublic);
    bookingPublic.set("providerPublic", object.attributes.provider);
    bookingPublic.set("service", object.attributes.service);
    await bookingPublic.save(null, { useMasterKey: true });


    const userPublic = bookingPublic.attributes.userPublic;
    const providerPublic = bookingPublic.attributes.providerPublic;

    const Events = Moralis.Object.extend("Events");

    const queryUserEvents = new Moralis.Query(Events);
    queryUserEvents.equalTo("userPublic", userPublic);
    const userEvents = await queryUserEvents.first();
    let newUserEventsArray = [{ id: Date.now(), title: `New Booking ${object.id} made`, detail: `Your booking ${object.id} has been made. Please wait for the booking provider to respond. Click here to view your booking.`, link: `/activity/you/booked/${object.id}`, side: "user" }].concat(userEvents.attributes.newEvents);
    userEvents.set("newEvents", newUserEventsArray);
    await userEvents.save(null, { useMasterKey: true });

    const queryProviderEvents = new Moralis.Query(Events);
    queryProviderEvents.equalTo("userPublic", providerPublic);
    const providerEvents = await queryProviderEvents.first();
    let newProviderEventsArray = [{ id: Date.now(), title: `New Booking ${object.id} received`, detail: `A user has booked your service. The booking # is ${object.id}. Click here to view and respond to booking.`, link: `/activity/who/bookings/${object.id}`, side: "provider" }].concat(providerEvents.attributes.newEvents);
    providerEvents.set("newEvents", newProviderEventsArray);
    await providerEvents.save(null, { useMasterKey: true });



    return;

});


Moralis.Cloud.afterSave("BookingsApproval", async (request) => {

    const { object } = request;
    // const object = request.object;

    const BookingsPublic = Moralis.Object.extend("BookingsPublic");
    const query = new Moralis.Query(BookingsPublic);
    query.equalTo("booking", object.attributes.bookings);
    query.include("providerPublic");
    query.include("userPublic");

    let bookingPublic = await query.first();
    bookingPublic.set('approval', object.attributes.approval);
    bookingPublic.set('bookingsApproval', object);
    await bookingPublic.save(null, { useMasterKey: true });

    if (object.attributes.approval === "approved" || object.attributes.approval === "declined") {

        const userPublic = bookingPublic.attributes.userPublic;
        const providerPublic = bookingPublic.attributes.providerPublic;

        const Events = Moralis.Object.extend("Events");

        const queryUserEvents = new Moralis.Query(Events);
        queryUserEvents.equalTo("userPublic", userPublic);
        const userEvents = await queryUserEvents.first();
        let newUserEventsArray = [{ id: Date.now(), title: `Booking ${bookingPublic.attributes.booking.id} ${object.attributes.approval}`, detail: `Your booking ${bookingPublic.attributes.booking.id} has been ${object.attributes.approval}. Click here to view your booking.`, link: `/activity/you/booked/${bookingPublic.attributes.booking.id}`, side: "user" }].concat(userEvents.attributes.newEvents);
        userEvents.set("newEvents", newUserEventsArray);
        await userEvents.save(null, { useMasterKey: true });

        const queryProviderEvents = new Moralis.Query(Events);
        queryProviderEvents.equalTo("userPublic", providerPublic);
        const providerEvents = await queryProviderEvents.first();
        let newProviderEventsArray = [{ id: Date.now(), title: `You ${object.attributes.approval} booking ${bookingPublic.attributes.booking.id}`, detail: `Booking ${bookingPublic.attributes.booking.id} has been ${object.attributes.approval}. Click here to view your booking.`, link: `/activity/who/bookings/${bookingPublic.attributes.booking.id}`, side: "provider" }].concat(providerEvents.attributes.newEvents);
        providerEvents.set("newEvents", newProviderEventsArray);
        await providerEvents.save(null, { useMasterKey: true });

    }

    return;

});


Moralis.Cloud.define("sendYouMessage", async (request) => {

    const { bookingId, newMessagesArray, sideUnread } = request.params;

    const Chats = Moralis.Object.extend("Chats");
    let queryChats = new Moralis.Query(Chats);
    queryChats.equalTo("bookingId", bookingId);
    let chat = await queryChats.first();

    chat.set("messages", newMessagesArray);
    chat.set("providerRead", false);

    let newChats = await chat.save(null, { useMasterKey: true });

    return newChats;

});

Moralis.Cloud.define("sendWhoMessage", async (request) => {

    const { bookingId, newMessagesArray } = request.params;

    const Chats = Moralis.Object.extend("Chats");
    let queryChats = new Moralis.Query(Chats);
    queryChats.equalTo("bookingId", bookingId);
    let chat = await queryChats.first();

    chat.set("messages", newMessagesArray);
    chat.set("userRead", false);

    let newChats = await chat.save(null, { useMasterKey: true });

    return newChats;

});

Moralis.Cloud.define("readWhoMessage", async (request) => {

    const { bookingId } = request.params;

    const Chats = Moralis.Object.extend("Chats");
    let queryChats = new Moralis.Query(Chats);
    queryChats.equalTo("bookingId", bookingId);
    let chat = await queryChats.first();

    chat.set('providerRead', true);

    let newChats = await chat.save(null, { useMasterKey: true });

    return newChats;

});
