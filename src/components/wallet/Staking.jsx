import React, { useContext, useEffect, useState } from 'react';
import { Text, Center, Stack, Spinner, Box, Flex, IconButton, Spacer, Button, useDisclosure, Icon, Image, Container, AspectRatio, useToast, useColorMode, Avatar, ModalFooter, ModalHeader, ModalCloseButton, ModalBody, Modal, ModalOverlay, ModalContent, Input, useRadioGroup, useRadio, HStack, RadioGroup, InputGroup, InputLeftElement, InputRightElement, InputRightAddon, InputLeftAddon } from "@chakra-ui/react";
import Web3 from 'web3';
import YouWhoDapp from '../../abis/YouWhoDapp.json';
import YouWhoToken from '../../abis/YouWhoToken.json';
import YouWhoUSD from '../../abis/YouWhoUSD.json';
import * as BsI from "react-icons/bs";
import * as Io5 from "react-icons/io5";
import * as FaI from "react-icons/fa";
import * as GiI from "react-icons/gi";
import * as TiI from "react-icons/ti";
import * as RiI from "react-icons/ri";
import { SiteStateContext } from '../context/SiteStateContext';
import YouWhoLoading from '../misc/YouWhoLoading';
import ReactStars from "react-rating-stars-component";
import Moralis from "moralis";



export default function Staking() {

    const { isOpen, onOpen, onClose } = useDisclosure()
    const { colorMode } = useColorMode();
    const [web3, setWeb3] = useState('undefined');
    const [account, setAccount] = useState("");
    const [uhu, setUhu] = useState({});
    const [uhuDapp, setUhuDapp] = useState({});
    const [myDeposit, setMyDeposit] = useState(0);
    const [myInterest, setMyInterest] = useState(0);
    const [balance, setBalance] = useState(0);
    const [uhuApy, setUhuApy] = useState("10");
    const [depositAmount, setDepositAmount] = useState(0);
    const [myUhuAllowance, setMyUhuAllowance] = useState(0);
    const [refreshTab, setRefreshTab] = useState(false);
    const [spinnerLoading, setSpinnerLoading] = useState(false);
    const { siteIsLoading2, setSiteIsLoading2 } = useContext(SiteStateContext);


    useEffect(() => {
        (async () => {
            setRefreshTab(false);
            await loadBlockchainData().catch((e) => {
                setSiteIsLoading2(false);
            });
        })();
    }, [refreshTab])

    let loadBlockchainData = async () => {

        if (typeof window.ethereum !== 'undefined') {
            setSiteIsLoading2(true);

            const web3 = new Web3(window.ethereum);
            const netId = await web3.eth.net.getId();
            const accounts = await web3.eth.getAccounts();
            // console.log("accounts",accounts);
            // console.log("netId",netId);

            if (typeof accounts[0] !== 'undefined') {
                const balance = await web3.eth.getBalance(accounts[0]);
                setAccount(accounts[0]);
                // console.log("accounts[0]",accounts[0])
                setWeb3(web3);
                // console.log("web3",web3)
            } else {
                window.alert('Please login with MetaMask');
            }

            try {

                const uhuC = new web3.eth.Contract(YouWhoToken.abi, YouWhoToken.networks[netId].address);
                setUhu(uhuC);
                // console.log('uhu contract: ', uhuC);

                const currUhuBalance = await uhuC.methods.balanceOf(accounts[0]).call({ from: accounts[0] });
                setBalance(currUhuBalance);

                const currUhuAllowance = await uhuC.methods.allowance(accounts[0], YouWhoDapp.networks[netId].address).call({ from: accounts[0] });
                setMyUhuAllowance(currUhuAllowance);
                // console.log("myUhuAllowance", currUhuAllowance);

                const uhuDappC = new web3.eth.Contract(YouWhoDapp.abi, YouWhoDapp.networks[netId].address);
                setUhuDapp(uhuDappC);
                // console.log('uhuDapp contract: ', uhuDappC);

                const currUhuApy = await uhuDappC.methods.interest_().call();
                setUhuApy(currUhuApy);

                const myUhuBalance = await uhuDappC.methods.uhuBalanceOf(accounts[0]).call({ from: accounts[0] });
                setMyDeposit(myUhuBalance, "ether");
                // console.log(myUhuBalance)

                const myUhuInterest = myUhuBalance > 0 ? await uhuDappC.methods.myStakeInterest().call({ from: accounts[0] }) : 0;
                setMyInterest(myUhuInterest);

                setSiteIsLoading2(false);

            } catch (e) {
                console.log('Error', e);
                window.alert('Contract not deployed to the current network');
                setSiteIsLoading2(false);
            }

        } else {
            // window.alert('Please install MetaMask');
        }

    }


    const depositStake = async (e) => {
        e.preventDefault();
        if (uhuDapp !== 'undefined') {
            if (myUhuAllowance > depositAmount) {
                try {
                    setSiteIsLoading2(true)
                    await uhuDapp.methods.depositStake(String(depositAmount)).send({ from: account });
                    setMyDeposit(depositAmount);
                    setSiteIsLoading2(false);
                    setRefreshTab(true);
                } catch (e) {
                    console.error('Error, deposit: ', e);
                    setSiteIsLoading2(false);
                }
            } else {
                try {
                    setSiteIsLoading2(true)
                    // console.log("CC")
                    await uhu.methods.approve(uhuDapp._address, web3.utils.toWei("9999999999999999999999999", "ether")).send({ from: account }).then(() => {
                        // console.log("Succes");
                        setSiteIsLoading2(false);
                        setRefreshTab(true);
                        // window.location.reload();
                    });
                } catch (e) {
                    console.error('Error, deposit: ', e);
                    setSiteIsLoading2(false);
                }
            }
        }
    };

    const myStakeInterest = async (e) => {
        e.preventDefault();

        if (uhuDapp !== 'undefined') {
            try {
                setSpinnerLoading(true);
                let currentInterest = await uhuDapp.methods.myStakeInterest().call({ from: account });
                setMyInterest(currentInterest);
                // console.log("checked");
                setSpinnerLoading(false);
            } catch (e) {
                console.error('Error, withdraw: ', e);
                setSpinnerLoading(false);
            }
            //check if this.state.uhuDapp is ok
            //in try block call dBank deposit();
        }

    };


    const withdrawStake = async (e) => {
        e.preventDefault();

        if (uhuDapp !== 'undefined') {
            try {
                setSiteIsLoading2(true)
                await uhuDapp.methods.withdrawStake().send({ from: account }).then(async () => {
                    const myUhuBalance = await uhuDapp.methods.uhuBalanceOf(account).call();
                    setMyDeposit(myUhuBalance);
                    setSiteIsLoading2(false);
                    // console.log("withdraw success");
                    setRefreshTab(true);
                });
            } catch (e) {
                console.error('Error, withdraw: ', e);
                setSiteIsLoading2(false);
            }
            //check if this.state.uhuDapp is ok
            //in try block call dBank deposit();
        }

    };

    const grayText = colorMode === "light" ? "gray.500" : "gray.400";


    return (
        <>
            {siteIsLoading2 ?
                <YouWhoLoading />
                :
                <>
                    {String(myUhuAllowance) > String(depositAmount) ?
                        <>
                            {String(myDeposit) > 0 ?
                                <>
                                    <Stack spacing="4" m={["0", "4", "", ""]}>
                                        <Center mt={2}>
                                            <Text fontSize="2xl" color={grayText} ><Icon as={GiI.GiFarmer} mb="2px" mr={["0", "3", "", ""]} w="38px" h="38px" color="secondary.300" />Withdraw My Stake</Text>
                                        </Center>
                                        <Stack spacing="0" p={4} bg="gray.10" borderRadius="lg">
                                            <Flex minHeight="52px" align="center">
                                                <Text>Currently Deposited : <Text as="span" color="primary.500" fontWeight="600">{Number(myDeposit / 10 ** 18).toFixed(4)} UHU</Text></Text>
                                            </Flex>
                                            <Flex minHeight="52px" align="center">
                                                <Text>Current Staking APY : <Text as="span" color="secondary.300" fontWeight="600">{uhuApy / 100}%</Text></Text>
                                            </Flex>
                                            <Flex minHeight="52px" align="center">
                                                <Text fontWeight="600">Accrued Interest : <Text as="span" color="secondary.300" fontWeight="600">{Number(myInterest / 10 ** 18).toFixed(4)} UHU</Text><IconButton icon={<BsI.BsArrowRepeat />} mb="4px" fontSize="lg" ml={3} variant="unstyled" onClick={myStakeInterest} isLoading={spinnerLoading} /></Text>
                                            </Flex>
                                        </Stack>
                                    </Stack>
                                    <Stack pt="4" m={2}>
                                        <Button onClick={withdrawStake} size="lg" color="primary.600" bg="primary.100" _hover={{ bg: "primary.200" }} _focus={{ bg: "primary.100" }} _active={{ bg: "primary.100" }} >Withdraw Now <Icon as={GiI.GiFarmTractor} ml={3} w="28px" h="28px" /></Button>
                                    </Stack>
                                </>
                                :
                                <>
                                    <Stack spacing="4" m={["0", "4", "", ""]}>
                                        <Center mt={2}>
                                            <Text fontSize="2xl" color={grayText} ><Icon as={GiI.GiFarmer} mb="7px" mr={["0", "2", "", ""]} w="34px" h="34px" color="primary.400" />Deposit To Staking</Text>
                                        </Center>
                                        <Text>You currently own <Text as="span" color="primary.500" fontWeight="600">{Number(balance / 10 ** 18).toFixed(4)} UHU</Text> tokens.</Text>
                                        <Text>You are not staking any of your <Text as="span" color="primary.500" fontWeight="600">UHU</Text> tokens. Please input the amount of tokens you would like to stake below.</Text>
                                        <Text>Current Staking APY : <Text as="span" color="secondary.300" fontWeight="600">{uhuApy / 100} %</Text></Text>
                                        <Center pt={2}>
                                            <InputGroup w="80%">
                                                <InputLeftElement ml={2} children={<Text color="primary.500" fontWeight="600" fontSize="sm">UHU</Text>} />
                                                <Input placeholder="Enter amount" id="depositInput" type="number" pl="50px" onChange={(e) => setDepositAmount((e.target.value * 10 ** 18))} />
                                                <InputRightAddon as="button" children="Max." onClick={() => { document.getElementById("depositInput").value = Number(balance / 10 ** 18).toFixed(4); setDepositAmount(balance) }} />
                                            </InputGroup>
                                        </Center>
                                    </Stack>
                                    <Stack pt="4" m={2}>
                                        <Button onClick={depositStake} size="lg" color="secondary.500" bg="secondary.100" _hover={{ bg: "secondary.200" }} _focus={{ bg: "secondary.100" }} _active={{ bg: "secondary.100" }} >Deposit Now <Icon as={BsI.BsBoxArrowInRight} ml={2} w="28px" h="28px" /></Button>
                                    </Stack>
                                </>
                            }
                        </>
                        :
                        <>
                            <Stack spacing="4" m={4}>
                                <Center mt={2}>
                                    <Text fontSize="2xl" color={grayText} ><Icon as={FaI.FaRegHandshake} mb="2px" mr={3} w="38px" h="38px" color="primary.400" />Approve Staking</Text>
                                </Center>
                                <Text>You must approve the staking of your <Text as="span" color="primary.500" fontWeight="600">UHU</Text> tokens first.</Text>
                                <Text>This is a one time approval that is standard for all <Text as="span" color="primary.500" fontWeight="600">ERC-20</Text> tokens that must be completed when staking with a new <Text as="span" color="primary.500" fontWeight="600">Ethereum</Text> wallet address for the first time.</Text>
                                <Text>Please click the <Text as="span" color="secondary.300" fontWeight="600">Approve Now</Text> button below to approve.</Text>
                            </Stack>
                            <Stack pt="4" m={2}>
                                <Button onClick={depositStake} size="lg" color="secondary.500" bg="secondary.100" _hover={{ bg: "secondary.200" }} _focus={{ bg: "secondary.100" }} _active={{ bg: "secondary.100" }} >Approve Now <Icon as={FaI.FaCheckDouble} ml={3} w="20px" h="20px" /></Button>
                            </Stack>
                        </>
                    }
                </>
            }
        </>
    )
}
