const YouWho = artifacts.require('YouWho')
const YouWhoDapp = artifacts.require('YouWhoDapp')

const ETHER_ADDRESS = '0x0000000000000000000000000000000000000000'
const EVM_REVERT = 'VM Exception while processing transaction: revert'

const ether = n => {
  return new web3.utils.BN(
    web3.utils.toWei(n.toString(), 'ether')
  )
}

const wait = s => {
  const milliseconds = s * 1000
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

require('chai')
  .use(require('chai-as-promised'))
  .should()

contract('YouWhoDapp', (accounts) => {
  let uhuDapp, uhu;
  const interestPerSecond = 31668017; //(10% APY) for min. deposit (0.01 ETH)

  const user1 = accounts[1];
  const provider1 = accounts[2];
  const user2 = accounts[3];
  const provider2 = accounts[4];

  beforeEach(async () => {
    uhu = await YouWho.new(accounts[0], accounts[1], accounts[2], accounts[3], accounts[4]);
    uhuDapp = await YouWhoDapp.new(uhu.address, uhu.address, accounts[0]);
    minterRole = await uhu.MINTER_ROLE();
    await uhu.grantRole(minterRole, uhuDapp.address, { from: accounts[0] });
  })

  describe('testing uhu contract...', () => {

    describe('success', () => {
      it('checking uhu name', async () => {
        expect(await uhu.name()).to.be.eq('YouWho')
      })

      it('checking uhu symbol', async () => {
        expect(await uhu.symbol()).to.be.eq('UHU')
      })

      it('checking uhu initial total supply', async () => {
        expect(Number(await uhu.totalSupply())).to.eq(133700009*(10**18)*59/100);
      })

      it('YouWhoDapp should have Token minter role', async () => {
        expect(await uhu.hasRole(minterRole,uhuDapp.address)).to.eq(true)
      })
    })

    describe('failure', () => {
      it('passing minter role should be rejected', async () => {
        await uhu.grantRole(minterRole, provider1, { from: user1 }).should.be.rejectedWith(EVM_REVERT);
      })

      it('uhus minting should be rejected', async () => {
        await uhu.mint(user1, '1', { from: user1 }).should.be.rejectedWith(EVM_REVERT) //unauthorized minter
      })
    })
    
  })

//   describe('testing deposit...', () => {
//     let balance

//     describe('success', () => {
//       beforeEach(async () => {
//         await uhuDapp.deposit({ value: 10 ** 18, from: user1 }); //1 ETH
//       })

//       // it('balance should increase', async () => {
//       //   expect(Number(await uhuDapp.etherBalanceOf(user1))).to.eq(10 ** 18)
//       // })

//       // it('deposit time should > 0', async () => {
//       //   expect(Number(await uhuDapp.depositStart(user1))).to.be.above(0)
//       // })

//       // it('deposit status should eq true', async () => {
//       //   expect(await uhuDapp.isDeposited(user1)).to.eq(true)
//       // })

//       it('interest should be greater than 0', async () => {
//         await wait(7);
//         let myEtherBal = await uhuDapp.etherBalanceOf(user1);
//         console.log("ETH :", myEtherBal.toString());
//         let checkInterest = await uhuDapp.myTokenInterest({from: user1});
//         console.log("INTEREST :", checkInterest.toString());
//         expect(Number(checkInterest)).to.be.above(0);
//       })
//     })

//     // describe('failure', () => {
//     //   it('depositing should be rejected', async () => {
//     //     await uhuDapp.deposit({ value: 10 ** 15, from: user1 }).should.be.rejectedWith(EVM_REVERT) //to small amount
//     //   })
//     // })
//   })

  // describe('testing withdraw...', () => {
  //   let balance

  //   describe('success', () => {

  //     beforeEach(async () => {
  //       await uhuDapp.deposit({ value: 10 ** 16, from: user1 }) //0.01 ETH

  //       await wait(2) //accruing interest

  //       balance = await web3.eth.getBalance(user1)
  //       await uhuDapp.withdraw({ from: user1 })
  //     })

  //     it('balances should decrease', async () => {
  //       expect(Number(await web3.eth.getBalance(uhuDapp.address))).to.eq(0)
  //       expect(Number(await uhuDapp.etherBalanceOf(user1))).to.eq(0)
  //     })

  //     it('user1 should receive ether back', async () => {
  //       expect(Number(await web3.eth.getBalance(user1))).to.be.above(Number(balance))
  //     })

  //     it('user1 should receive proper amount of interest', async () => {
  //       //time synchronization problem make us check the 1-3s range for 2s deposit time
  //       balance = Number(await uhu.balanceOf(user1))
  //       expect(balance).to.be.above(0)
  //       expect(balance % interestPerSecond).to.eq(0)
  //       expect(balance).to.be.below(interestPerSecond * 4)
  //     })

  //     it('depositer data should be reseted', async () => {
  //       expect(Number(await uhuDapp.depositStart(user1))).to.eq(0)
  //       expect(Number(await uhuDapp.etherBalanceOf(user1))).to.eq(0)
  //       expect(await uhuDapp.isDeposited(user1)).to.eq(false)
  //     })
  //   })

  //   describe('failure', () => {
  //     it('withdrawing should be rejected', async () => {
  //       await uhuDapp.deposit({ value: 10 ** 16, from: user1 }) //0.01 ETH
  //       await wait(2) //accruing interest
  //       await uhuDapp.withdraw({ from: accounts[0] }).should.be.rejectedWith(EVM_REVERT) //wrong user1
  //     })
  //   })
  // })
})