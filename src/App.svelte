<script>
  let currencies = ["gbp", "usd"];
  let coinList = ["bitcoin", "cardano", "ark", "dogecoin"];
  let coinInformation;

  let savedInfo = localStorage.getItem("coinInformation");

  if (savedInfo) {
    coinInformation = JSON.parse(savedInfo);
  } else {
    coinInformation = [
      {
        id: 1,
        symbol: "bitcoin",
        amount: 0.0,
        purchasePrice: 0.0,
        currentMarketPrice: {
          gbp: 0.0,
          usd: 0.0,
        },
      },
      {
        id: 2,
        symbol: "cardano",
        amount: 0.0,
        purchasePrice: 0.0,
        currentMarketPrice: {
          gbp: 0.0,
          usd: 0.0,
        },
      },
    ];
  }

  let newCoin = coinList[0];

  function getMarketData() {
    return fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinInformation
        .map((coin) => coin.symbol)
        .join("%2C")}&vs_currencies=${currencies.join("%2C")}`
    )
      .then((response) => response.json())
      .then((result) => {
        let newInfo = coinInformation.map((coin) => {
          coin.currentMarketPrice["gbp"] = parseFloat(
            result[coin.symbol]["gbp"]
          );
          coin.currentMarketPrice["usd"] = parseFloat(
            result[coin.symbol]["usd"]
          );

          return coin;
        });

        coinInformation = [...newInfo];
        localStorage.setItem(
          "coinInformation",
          JSON.stringify(coinInformation)
        );
        return result;
      });
  }

  function handleAddCoin() {
    coinInformation = [
      ...coinInformation,
      {
        id: coinInformation.length + 2,
        symbol: newCoin,
        amount: 0.0,
        purchasePrice: 0.0,
        currentMarketPrice: {
          gbp: 0.0,
          usd: 0.0,
        },
      },
    ];
    getMarketData();
  }

  function handleRemoveCoin(id) {
    let update = coinInformation.filter((item) => item.id !== id);
    coinInformation = [...update];
    localStorage.setItem("coinInformation", JSON.stringify(coinInformation));
  }

  $: percentageChange = coinInformation
    .reduce(function (total, coin) {
      return coin.currentMarketPrice !== 0
        ? total +
            coin.amount * (coin.currentMarketPrice.gbp / coin.purchasePrice)
        : 0;
    }, 0)
    .toFixed(0);

  $: currentInvestmentValue = coinInformation
    .reduce(function (total, coin) {
      return coin.currentMarketPrice !== 0
        ? total +
            coin.amount * (coin.currentMarketPrice.gbp - coin.purchasePrice)
        : 0;
    }, 0)
    .toFixed(2);

  $: totalInvested = coinInformation.reduce((total, coin) => {
    return total + coin.amount * coin.purchasePrice;
  }, 0);

  // Do the initial fetch of the data on page load.
  getMarketData();

  setInterval(getMarketData, 10000);
</script>

<div class="container">
  <div class="justify-content-center py-4">
    <h1>Investment Aggre-gator 🐊</h1>
  </div>

  <div class="row my-5">
    <div class="col justify-content-center shadow p-3 mb-5 bg-body rounded text-center">
      <h3>Total Invested</h3>
      <h2>£{totalInvested}</h2>
    </div>
    <div class="col mx-3 shadow p-3 mb-5 bg-body rounded text-center">
      <h3 class="justify-content-center ">Current investment gains</h3>
      <h2>£{currentInvestmentValue}</h2>
    </div>
    <div class="col shadow p-3 mb-5 bg-body rounded text-center">
      <h3 class="justify-content-center ">Percentage change</h3>
      <h2>{percentageChange -100 }%</h2>
    </div>
  </div>

  {#each coinInformation as coin}
    <div>
      <div class="row gx-3 gy-2 justify-content-center align-items-center my-2">
        <div class="col-sm-1 gy-4">
          <span class="">{coin.symbol}</span>
        </div>
        <div class="col-auto">
          <input type="number" class="form-control" bind:value={coin.amount} />
        </div>
        <div class="col-auto">
          <input
            type="number"
            class="form-control"
            bind:value={coin.purchasePrice}
          />
        </div>
        <button
          class="btn btn-primary col-sm-2"
          on:click={() => handleRemoveCoin(coin.id)}
          >remove {coin.symbol}</button
        >
      </div>
    </div>
  {/each}

  <div class="row justify-content-center align-items-end">
    <div class="col-sm-3 gy-4">
      <label class="visually-hidden" for="specificSizeSelect">Preference</label>
      <select class="form-select" id="specificSizeSelect" bind:value={newCoin}>
        {#each coinList.filter((item) => !coinInformation
              .map((item) => item.symbol)
              .includes(item)) as coin}
          <option value={coin}>{coin}</option>
        {/each}
      </select>
    </div>
    <div class="col-auto">
      <button class="btn btn-primary" on:click={handleAddCoin}>add coin</button>
    </div>
  </div>

  <table class="table">
    <thead>
      <tr>
        <th scope="col">Coin</th>
        <th scope="col">£ gbp</th>
        <th scope="col">$ usd</th>
      </tr>
    </thead>
    <tbody>
      {#each coinInformation as coinInfo}
        <tr>
          <th scope="row">{coinInfo.symbol}</th>
          <td>{coinInfo.currentMarketPrice.gbp}</td>
          <td>{coinInfo.currentMarketPrice.usd}</td>
        </tr>
      {/each}
    </tbody>
  </table>


  <div class="form-check form-switch">
    <input class="form-check-input" type="checkbox" id="flexSwitchCheckChecked">
    <label class="form-check-label" for="flexSwitchCheckChecked">Notifications</label>
  </div>


</div>

<style>
</style>
